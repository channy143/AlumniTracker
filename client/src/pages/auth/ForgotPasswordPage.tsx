import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
import { authApi } from '@/services/api';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
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
      <Link to="/auth/login" className="inline-flex w-9 h-9 items-center justify-center rounded-xl text-gray-400 hover:text-ctu-blue hover:bg-gray-100 transition-all mb-4">
        <ArrowLeftIcon className="w-5 h-5" />
      </Link>

      <AnimatePresence mode="wait">
        {step === 'email' ? (
          <motion.div key="email" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
            <h2 className="text-3xl font-bold text-ctu-charcoal mb-2">Forgot Password?</h2>
            <p className="text-gray-500 mb-8">Enter your email and we'll send a reset code.</p>

            {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-ctu-charcoal mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="alumni@ctu.edu.ph" required />
              </div>
              <div className="flex justify-center" ref={captchaContainerRef} />
              <button type="button" onClick={handleSendCode} disabled={loading} className="btn-primary w-full">
                {loading ? 'Sending code...' : 'Send Reset Code'}
              </button>
            </div>
          </motion.div>
        ) : step === 'otp' ? (
          <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                <CheckIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ctu-charcoal">Verify Your Email</h2>
                <p className="text-sm text-gray-500">{email}</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mt-4 mb-8">Enter the 6-digit code sent to your email.</p>

            {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-ctu-charcoal mb-1.5">Reset Code</label>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} className="input-field text-center text-2xl tracking-[0.5em] font-mono" placeholder="000000" maxLength={6} required autoFocus />
              </div>
              <button type="button" onClick={handleVerifyOtp} className="btn-primary w-full">
                Verify Code
              </button>
              <button type="button" onClick={() => { setStep('email'); setError(''); }} className="w-full text-sm text-gray-400 hover:text-ctu-blue transition-colors text-center">
                ← Back to email entry
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="password" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                <CheckIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ctu-charcoal">Reset Your Password</h2>
                <p className="text-sm text-gray-500">{email}</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mt-4 mb-8">Choose a new password for your account.</p>

            {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ctu-charcoal mb-1.5">New Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" required autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-ctu-charcoal mb-1.5">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field" required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              <button type="button" onClick={() => { setStep('otp'); setError(''); }} className="w-full text-sm text-gray-400 hover:text-ctu-blue transition-colors text-center">
                ← Back to code entry
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
