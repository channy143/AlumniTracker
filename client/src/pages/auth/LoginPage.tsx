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
        <Link to="/" className="inline-flex w-9 h-9 items-center justify-center rounded-xl text-gray-400 hover:text-ctu-blue hover:bg-gray-100 transition-all mb-4">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <h2 className="text-3xl font-bold text-ctu-charcoal mb-2">Two-Factor Authentication</h2>
        <p className="text-gray-500 mb-6">Enter the code sent to your email to verify and remember this device.</p>

        <div className="flex items-start gap-2.5 bg-blue-50/70 border border-blue-200/70 text-blue-800 px-3.5 py-3 rounded-xl mb-6 text-xs leading-relaxed">
          <ShieldCheckIcon className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            <strong>First time on this device:</strong> Once verified, this device will be remembered so you won't need to enter a code on future logins from this browser.
          </span>
        </div>

        <form onSubmit={handleMfaSubmit} className="space-y-5">
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${mfaError ? 'text-red-600' : 'text-ctu-charcoal'}`}>
              Verification Code
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                if (mfaError) setMfaError(null);
              }}
              className={`input-field text-center text-3xl tracking-[0.5em] font-mono ${
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
            className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
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
            className="w-full text-sm text-ctu-blue hover:underline disabled:opacity-50 text-center"
          >
            {mfaCooldownSeconds > 0
              ? `Resend code in ${mfaCooldownSeconds}s`
              : mfaSending
                ? 'Sending...'
                : 'Resend code'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Want to go back?{' '}
          <Link to="/auth/register" className="text-ctu-blue font-medium hover:underline">Register here</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <Link to="/" className="inline-flex w-9 h-9 items-center justify-center rounded-xl text-gray-400 hover:text-ctu-blue hover:bg-gray-100 transition-all mb-4">
        <ArrowLeftIcon className="w-5 h-5" />
      </Link>
      <h2 className="text-3xl font-bold text-ctu-charcoal mb-2">Welcome Back</h2>
      <p className="text-gray-500 mb-8">Sign in to your alumni account</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Username / Email textfield with red highlight on error */}
        <div>
          <label className={`block text-sm font-medium mb-1.5 ${hasError ? 'text-red-600' : 'text-ctu-charcoal'}`}>
            Email Address
          </label>
          <input
            type="text"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearCredentialsError();
            }}
            className={`input-field ${hasError ? 'border-red-600 focus:ring-red-500/20 focus:border-red-600' : ''}`}
            placeholder="alumni@ctu.edu.ph"
            required
          />
        </div>

        {/* Password textfield with red highlight on error */}
        <div className="group">
          <label className={`block text-sm font-medium mb-1.5 ${hasError ? 'text-red-600' : 'text-ctu-charcoal'}`}>
            Enter your password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearCredentialsError();
              }}
              className={`input-field pr-11 ${hasError ? 'border-red-600 focus:ring-red-500/20 focus:border-red-600' : ''}`}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              onMouseDown={(e) => e.preventDefault()}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ctu-blue p-1 rounded-lg hover:bg-gray-100/70 transition-all opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
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

        <div className="flex items-center justify-between -mt-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-ctu-blue focus:ring-ctu-blue/20"
            />
            <span className="text-sm text-gray-500">Remember me</span>
          </label>
          <Link to="/auth/forgot-password" className="text-sm text-ctu-blue hover:text-ctu-marigold transition-colors font-medium">
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading || rateLimitCooldown > 0}
          className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading
            ? 'Signing in...'
            : rateLimitCooldown > 0
              ? `Rate Limited (Try again in ${rateLimitCooldown}s)`
              : 'Sign In'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don't have an account?{' '}
        <Link to="/auth/register" className="text-ctu-blue font-medium hover:underline">
          Register here
        </Link>
      </p>
    </div>
  );
}
