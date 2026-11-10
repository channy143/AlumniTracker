import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ShieldCheckIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api';
import { getOrCreateDeviceId, getTrustedDeviceToken, saveTrustedDeviceToken } from '@/utils/device';
import FieldErrorAlert from '@/components/auth/FieldErrorAlert';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Field error states
  const [hasError, setHasError] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // Rate limit cooldown state
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [otp, setOtp] = useState('');
  const [mfaSending, setMfaSending] = useState(false);
  const [mfaCooldownSeconds, setMfaCooldownSeconds] = useState(0);
  const [mfaError, setMfaError] = useState<string | null>(null);

  const { setUser, setToken } = useAuthStore();
  const navigate = useNavigate();

  // Rate limit countdown effect
  useEffect(() => {
    if (rateLimitCooldown <= 0) return;
    const timer = setInterval(() => {
      setRateLimitCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setHasError(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitCooldown]);

  // MFA resend cooldown effect
  useEffect(() => {
    if (mfaCooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setMfaCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [mfaCooldownSeconds]);

  const clearCredentialsError = () => {
    if (hasError) setHasError(false);
    if (remainingAttempts !== null) setRemainingAttempts(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearCredentialsError();

    if (rateLimitCooldown > 0) {
      setHasError(true);
      return;
    }

    setLoading(true);

    try {
      const deviceId = getOrCreateDeviceId();
      const deviceToken = getTrustedDeviceToken(email);

      const res = await authApi.login(email, password, deviceId, deviceToken);
      if (res.requiresMfa) {
        setMfaToken(res.mfaToken || '');
        setMfaRequired(true);
        setMfaCooldownSeconds(30);
        setLoading(false);
        return;
      }
      setToken(res.token!, rememberMe);
      const loggedUser = {
        id: res.user!.id,
        email: res.user!.email,
        role: res.user!.role,
        is_verified: false,
        survey_completed: res.user!.survey_completed,
        created_at: '',
      };
      setUser(loggedUser as any);
      if (res.user!.role === 'admin') {
        navigate('/admin');
      } else if (res.user!.survey_completed === false) {
        navigate('/survey/onboarding');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setHasError(true);
      const cooldown = err.cooldownSeconds || (err.status === 429 ? 30 : 0);
      if (cooldown > 0) {
        setRateLimitCooldown(cooldown);
      } else if (err.remainingAttempts !== undefined) {
        setRemainingAttempts(err.remainingAttempts);
      } else {
        setRemainingAttempts(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const sendMfaCode = async () => {
    if (mfaCooldownSeconds > 0) return;

    setMfaSending(true);
    setMfaError(null);
    try {
      await authApi.sendMfaCode(email, mfaToken);
      setMfaCooldownSeconds(30);
    } catch (err: any) {
      const cooldown = err.cooldownSeconds || (err.status === 429 ? 30 : 0);
      if (cooldown > 0) {
        setMfaCooldownSeconds(cooldown);
        setMfaError(`Please wait ${cooldown}s before requesting a new code.`);
      } else {
        setMfaError(err.message || 'Failed to send verification code.');
      }
    } finally {
      setMfaSending(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError(null);

    if (rateLimitCooldown > 0) {
      setMfaError(`Rate limit active. Please wait ${rateLimitCooldown}s before retrying.`);
      return;
    }

    if (!otp || otp.length !== 6) {
      setMfaError('Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await authApi.mfaVerify(email, otp, mfaToken, deviceId);

      if (res.trustedDeviceToken) {
        saveTrustedDeviceToken(email, res.trustedDeviceToken);
      }

      setToken(res.token!, rememberMe);
      const loggedUser = {
        id: res.user!.id,
        email: res.user!.email,
        role: res.user!.role,
        is_verified: false,
        survey_completed: res.user!.survey_completed,
        created_at: '',
      };
      setUser(loggedUser as any);
      if (res.user!.role === 'admin') {
        navigate('/admin');
      } else if (res.user!.survey_completed === false) {
        navigate('/survey/onboarding');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      const cooldown = err.cooldownSeconds || (err.status === 429 ? 30 : 0);
      if (cooldown > 0) {
        setRateLimitCooldown(cooldown);
        setMfaError(`Too many unsuccessful attempts. Please try again in ${cooldown}s.`);
      } else {
        setMfaError('Invalid verification code. Please check and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (mfaRequired) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-ctu-blue py-1.5 px-2.5 -ml-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-md bg-blue-50 text-ctu-blue border border-blue-100/80">
            Security Check
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-ctu-charcoal tracking-tight mb-1.5">Two-Factor Authentication</h2>
        <p className="text-slate-500 text-xs sm:text-sm mb-5">Enter the code sent to your email to verify and remember this device.</p>

        <div className="flex items-start gap-2.5 bg-blue-50/70 border border-blue-200/70 text-blue-800 px-3.5 py-3 rounded-xl mb-5 text-xs leading-relaxed">
          <ShieldCheckIcon className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            <strong>First time on this device:</strong> Once verified, this device will be remembered so you won't need to enter a code on future logins from this browser.
          </span>
        </div>

        <form onSubmit={handleMfaSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className={`block text-xs sm:text-sm font-medium mb-1.5 ${mfaError ? 'text-red-600' : 'text-ctu-charcoal'}`}>
              Verification Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                if (mfaError) setMfaError(null);
              }}
              className={`input-field text-center text-2xl sm:text-3xl tracking-[0.25em] sm:tracking-[0.5em] font-mono h-12 ${
                mfaError ? 'border-red-600 focus:ring-red-500/20 focus:border-red-600' : ''
              }`}
              placeholder="000000"
              maxLength={6}
              required
              autoFocus
            />
            <FieldErrorAlert message={mfaError} />
          </div>

          <button
            type="submit"
            disabled={loading || rateLimitCooldown > 0}
            className="btn-primary w-full h-11 font-semibold flex items-center justify-center shadow-sm active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading
              ? 'Verifying...'
              : rateLimitCooldown > 0
                ? `Rate Limited (${rateLimitCooldown}s)`
                : 'Verify & Sign In'}
          </button>

          <button
            type="button"
            onClick={() => sendMfaCode()}
            disabled={mfaSending || mfaCooldownSeconds > 0}
            className="w-full text-xs sm:text-sm text-ctu-blue hover:underline disabled:opacity-50 text-center py-1"
          >
            {mfaCooldownSeconds > 0
              ? `Resend code in ${mfaCooldownSeconds}s`
              : mfaSending
                ? 'Sending...'
                : 'Resend code'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-xs sm:text-sm text-slate-500">
            Want to go back?{' '}
            <Link to="/auth/register" className="text-ctu-blue font-semibold hover:underline">Register here</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-ctu-blue py-1.5 px-2.5 -ml-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-md bg-blue-50 text-ctu-blue border border-blue-100/80">
          Alumni Portal
        </span>
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-ctu-charcoal tracking-tight mb-1.5">Welcome Back</h2>
      <p className="text-slate-500 text-xs sm:text-sm mb-6 sm:mb-8">Sign in to your CTU-Naga alumni account</p>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {/* Username / Email textfield with red highlight on error */}
        <div>
          <label className={`block text-xs sm:text-sm font-medium mb-1.5 ${hasError ? 'text-red-600' : 'text-ctu-charcoal'}`}>
            Email Address
          </label>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearCredentialsError();
            }}
            className={`input-field text-base sm:text-sm h-11 sm:h-10 ${hasError ? 'border-red-600 focus:ring-red-500/20 focus:border-red-600' : ''}`}
            placeholder="alumni@ctu.edu.ph"
            required
          />
        </div>

        {/* Password textfield with red highlight on error */}
        <div>
          <label className={`block text-xs sm:text-sm font-medium mb-1.5 ${hasError ? 'text-red-600' : 'text-ctu-charcoal'}`}>
            Enter your password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearCredentialsError();
              }}
              className={`input-field text-base sm:text-sm h-11 sm:h-10 pr-12 ${hasError ? 'border-red-600 focus:ring-red-500/20 focus:border-red-600' : ''}`}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              onMouseDown={(e) => e.preventDefault()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-400 hover:text-ctu-blue active:scale-95 transition-all rounded-lg hover:bg-slate-100"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>

          {/* Under password field: exact message matching the user screenshot */}
          {hasError && (
            <FieldErrorAlert
              message={
                rateLimitCooldown > 0 ? (
                  `Too many unsuccessful attempts. Please try again in ${rateLimitCooldown} seconds.`
                ) : remainingAttempts !== null && remainingAttempts > 0 ? (
                  <>
                    Wrong password. Try again ({remainingAttempts} attempts remaining) or click{' '}
                    <Link to="/auth/forgot-password" className="underline font-semibold hover:text-red-700 transition-colors">
                      Forgot password
                    </Link>{' '}
                    to reset it.
                  </>
                ) : (
                  <>
                    Wrong password. Try again or click{' '}
                    <Link to="/auth/forgot-password" className="underline font-semibold hover:text-red-700 transition-colors">
                      Forgot password
                    </Link>{' '}
                    to reset it.
                  </>
                )
              }
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-ctu-blue focus:ring-ctu-blue/20"
            />
            <span className="text-xs sm:text-sm text-slate-600">Remember me</span>
          </label>
          <Link to="/auth/forgot-password" className="text-xs sm:text-sm text-ctu-blue hover:text-ctu-marigold transition-colors font-medium py-1">
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading || rateLimitCooldown > 0}
          className="btn-primary w-full h-11 font-semibold flex items-center justify-center shadow-sm active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading
            ? 'Signing in...'
            : rateLimitCooldown > 0
              ? `Rate Limited (Try again in ${rateLimitCooldown}s)`
              : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100 text-center">
        <p className="text-xs sm:text-sm text-slate-500">
          Don't have an account?{' '}
          <Link to="/auth/register" className="text-ctu-blue font-semibold hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
