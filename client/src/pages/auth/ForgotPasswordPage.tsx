import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftIcon, CheckIcon, KeyIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { authApi } from '@/services/api';
import { isPasswordStrong, checkPasswordCriteria } from '@/utils/validation';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [widgetRendered, setWidgetRendered] = useState(false);
  const captchaContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (step !== 'email') return;
    setTurnstileToken('');
    setWidgetRendered(false);

    // Bypass Trusted Types CSP restriction for Turnstile
    const tt = (window as any).trustedTypes;
    if (tt && tt.createPolicy) {
      const orig = tt.createPolicy.bind(tt);
      tt.createPolicy = (name: string, options: any) => {
        try { return orig(name, options); } catch {
          try { return orig('default', options); } catch {
            return { createHTML: (i: string) => i, createScriptURL: (i: string) => i };
          }
        }
      };
    }

    const renderWidget = () => {
      if ((window as any).turnstile && captchaContainerRef.current) {
        try {
          (window as any).turnstile.render(captchaContainerRef.current, {
            sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAADzaIoBqRQR07Gis',
            callback: (token: string) => { setTurnstileToken(token); setWidgetRendered(true); },
            'expired-callback': () => setTurnstileToken(''),
          });
        } catch {}
      }
    };

    if ((window as any).turnstile) {
      setTimeout(renderWidget, 300);
      return;
    }

    const script = document.createElement('script');
    script.id = 'cf-turnstile-script';
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => setTimeout(renderWidget, 300);
    document.head.appendChild(script);
  }, [step]);

  const handleSendCode = async () => {
    setError('');
    if (!email) { setError('Please enter your email address'); return; }
    setLoading(true);
    try {
      await authApi.forgotPassword(email, turnstileToken);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = () => {
    setError('');
    if (!otp || otp.length !== 6) { setError('Please enter the 6-digit code'); return; }
    setStep('password');
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) { setError('Please enter a new password'); return; }
    if (!isPasswordStrong(password)) {
      setError('Password must meet strong password requirements: at least 8 characters, uppercase, lowercase, number, and special character');
      return;
    }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      await authApi.resetPassword(email, otp, password);
      navigate('/auth/login');
    } catch (err: any) {
      setError(err.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <Link to="/auth/login" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-ctu-blue py-1.5 px-2.5 -ml-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Back to Sign In</span>
        </Link>
      </div>

      <AnimatePresence mode="wait">
        {step === 'email' ? (
          <motion.div key="email" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
            <h2 className="text-2xl sm:text-3xl font-bold text-ctu-charcoal tracking-tight mb-1.5">Forgot Password?</h2>
            <p className="text-slate-500 text-xs sm:text-sm mb-6">Enter your email and we'll send a 6-digit reset code.</p>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl mb-5 text-xs">{error}</div>}

            <div className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-ctu-charcoal mb-1.5">Email Address</label>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field text-base sm:text-sm h-11 sm:h-10"
                  placeholder="alumni@ctu.edu.ph"
                  required
                />
              </div>
              <div className="flex justify-center items-center overflow-x-hidden max-w-full py-1 min-h-[70px]" ref={captchaContainerRef} />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={loading}
                className="btn-primary w-full h-11 font-semibold flex items-center justify-center shadow-sm active:scale-[0.99] transition-all"
              >
                {loading ? 'Sending code...' : 'Send Reset Code'}
              </button>
            </div>
          </motion.div>
        ) : step === 'otp' ? (
          <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <CheckIcon className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-ctu-charcoal">Verify Your Email</h2>
                <p className="text-xs sm:text-sm text-slate-500 truncate">{email}</p>
              </div>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-3 mb-6">Enter the 6-digit code sent to your email.</p>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl mb-5 text-xs">{error}</div>}

            <div className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-ctu-charcoal mb-1.5">Reset Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input-field text-center text-2xl sm:text-3xl tracking-[0.25em] sm:tracking-[0.5em] font-mono h-12"
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={handleVerifyOtp}
                className="btn-primary w-full h-11 font-semibold flex items-center justify-center shadow-sm active:scale-[0.99] transition-all"
              >
                Verify Code
              </button>
              <button
                type="button"
                onClick={() => { setStep('email'); setError(''); }}
                className="w-full text-xs sm:text-sm text-slate-400 hover:text-ctu-blue transition-colors text-center py-1"
              >
                ← Back to email entry
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="password" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <KeyIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-ctu-charcoal">Reset Your Password</h2>
                <p className="text-xs sm:text-sm text-slate-500 truncate">{email}</p>
              </div>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-3 mb-6">Choose a new strong password for your account.</p>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl mb-5 text-xs">{error}</div>}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-ctu-charcoal mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field text-base sm:text-sm h-11 sm:h-10 pr-12"
                    placeholder="Create new strong password"
                    required
                    autoFocus
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
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-ctu-charcoal mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field text-base sm:text-sm h-11 sm:h-10 pr-12"
                    placeholder="Re-enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-400 hover:text-ctu-blue active:scale-95 transition-all rounded-lg hover:bg-slate-100"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full h-11 font-semibold flex items-center justify-center shadow-sm active:scale-[0.99] transition-all"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('otp'); setError(''); }}
                className="w-full text-xs sm:text-sm text-slate-400 hover:text-ctu-blue transition-colors text-center py-1"
              >
                ← Back to code entry
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
