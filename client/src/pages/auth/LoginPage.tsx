import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [otp, setOtp] = useState('');
  const [mfaSending, setMfaSending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const { setUser, setToken } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.login(email, password);
      if (res.requiresMfa) {
        setMfaToken(res.mfaToken || '');
        setMfaRequired(true);
        setCooldownSeconds(30);
        setLoading(false);
        return;
      }
      setToken(res.token!, rememberMe);
      setUser({
        id: res.user!.id,
        email: res.user!.email,
        role: res.user!.role,
        is_verified: false,
        created_at: '',
      });
      navigate(res.user!.role === 'admin' ? '/admin' : '/');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const sendMfaCode = async () => {
    setMfaSending(true);
    setError('');
    try {
      await authApi.sendMfaCode(email, mfaToken);
      setCooldownSeconds(30);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code.');
    } finally {
      setMfaSending(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.mfaVerify(email, otp, mfaToken);
      setToken(res.token!, rememberMe);
      setUser({
        id: res.user!.id,
        email: res.user!.email,
        role: res.user!.role,
        is_verified: false,
        created_at: '',
      });
      navigate(res.user!.role === 'admin' ? '/admin' : '/');
    } catch (err: any) {
      setError(err.message || 'Invalid verification code.');
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
        <p className="text-gray-500 mb-8">Enter the code sent to your email to complete sign-in.</p>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
        )}

        <form onSubmit={handleMfaSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-ctu-charcoal mb-1.5">
              Verification Code
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input-field text-center text-3xl tracking-[0.5em] font-mono"
              placeholder="000000"
              maxLength={6}
              required
              autoFocus
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Verifying...' : 'Verify & Sign In'}
          </button>

          <button
            type="button"
            onClick={() => sendMfaCode()}
            disabled={mfaSending || cooldownSeconds > 0}
            className="w-full text-sm text-ctu-blue hover:underline disabled:opacity-50 text-center"
          >
            {cooldownSeconds > 0
              ? `Resend code in ${cooldownSeconds}s`
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

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-ctu-charcoal mb-1.5">
            Email Address
          </label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="alumni@ctu.edu.ph"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ctu-charcoal mb-1.5">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="Enter your password"
            required
          />
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

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Signing in...' : 'Sign In'}
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
