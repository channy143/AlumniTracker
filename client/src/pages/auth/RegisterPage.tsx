import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftIcon, CheckIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api';
import { generateYears } from '@/utils/helpers';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    program: '',
    yearGraduated: '',
    idNumber: '',
  });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'form' | 'captcha' | 'otp'>('form');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [widgetRendered, setWidgetRendered] = useState(false);
  const captchaContainerRef = useRef<HTMLDivElement>(null);
  const { setUser, setToken } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (step !== 'captcha') return;

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
          setWidgetRendered(true);
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

    return () => { /* cleanup handled by component lifecycle */ };
  }, [step]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateAccount = useCallback(async () => {
    setError('');

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.program || !formData.yearGraduated || !formData.idNumber || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setTurnstileToken('');
    setWidgetRendered(false);
    setStep('captcha');
  }, [formData]);

  const handleCaptchaSubmit = async () => {
    setError('');
    if (!turnstileToken) { setError('Please complete the security check'); return; }
    setLoading(true);
    try {
      await authApi.sendOtp(formData.email, turnstileToken);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
      setTurnstileToken('');
      if ((window as any).turnstile) {
        const container = captchaContainerRef.current;
        if (container) (window as any).turnstile.reset(container);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit code sent to your email');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.register({ ...formData, otp });
      setToken(res.token);
      setUser(res.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }, [formData, otp, setToken, setUser, navigate]);

  const years = generateYears(2014, new Date().getFullYear());

  return (
    <div>
      <Link to="/" className="inline-flex w-9 h-9 items-center justify-center rounded-xl text-gray-400 hover:text-ctu-blue hover:bg-gray-100 transition-all mb-4">
        <ArrowLeftIcon className="w-5 h-5" />
      </Link>

      <AnimatePresence mode="wait">
        {step === 'form' ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <h2 className="text-3xl font-bold text-ctu-charcoal mb-2">Join the Community</h2>
            <p className="text-gray-500 mb-8">Create your alumni account</p>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ctu-charcoal mb-1.5">First Name</label>
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ctu-charcoal mb-1.5">Last Name</label>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="input-field" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ctu-charcoal mb-1.5">Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field" placeholder="alumni@ctu.edu.ph" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-ctu-charcoal mb-1.5">ID Number</label>
                <input type="text" name="idNumber" value={formData.idNumber} onChange={handleChange} className="input-field" placeholder="e.g. CTU-2020-0001" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ctu-charcoal mb-1.5">Degree</label>
                  <select name="program" value={formData.program} onChange={handleChange} className="input-field" required>
                    <option value="">Select degree</option>
                    <option value="BEEd">BEEd</option>
                    <option value="BSEd-Math">BSEd-Math</option>
                    <option value="BTLED-HE">BTLED-HE</option>
                    <option value="BTLED-ICT">BTLED-ICT</option>
                    <option value="BIT">BIT</option>
                    <option value="BSIT">BSIT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ctu-charcoal mb-1.5">Year Graduated</label>
                  <select name="yearGraduated" value={formData.yearGraduated} onChange={handleChange} className="input-field" required>
                    <option value="">Select year</option>
                    {years.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ctu-charcoal mb-1.5">Password</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ctu-charcoal mb-1.5">Confirm Password</label>
                  <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="input-field" required />
                </div>
              </div>

              <button type="button" onClick={handleCreateAccount} disabled={loading} className="btn-primary w-full">
                {loading ? 'Sending verification code...' : 'Create Account'}
              </button>
            </div>
          </motion.div>
        ) : step === 'captcha' ? (
          <motion.div
            key="captcha"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ctu-charcoal">Security Check</h2>
                <p className="text-sm text-gray-500">{formData.email}</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mt-4 mb-6">Please complete the security check to continue with registration.</p>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
            )}

            <div className="space-y-5">
              <div className="flex justify-center" ref={captchaContainerRef} />
              {!widgetRendered && (
                <p className="text-xs text-gray-400 text-center">Loading security check...</p>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => { setStep('form'); setError(''); }} className="btn-secondary flex-1">
                  Back
                </button>
                <button type="button" onClick={handleCaptchaSubmit} disabled={loading || !turnstileToken} className="btn-primary flex-1">
                  {loading ? 'Sending OTP...' : 'Verify & Continue'}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                <CheckIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ctu-charcoal">Verify Your Email</h2>
                <p className="text-sm text-gray-500">{formData.email}</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mt-4 mb-8">
              We sent a 6-digit code to your email. Enter it below to activate your account.
            </p>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-ctu-charcoal mb-2">One-Time Password</label>
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
                {loading ? 'Verifying...' : 'Confirm & Activate Account'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('form'); setError(''); }}
                className="w-full text-sm text-gray-400 hover:text-ctu-blue transition-colors text-center"
              >
                ← Back to registration form
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {step === 'form' && (
        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/auth/login" className="text-ctu-blue font-medium hover:underline">Sign in</Link>
        </p>
      )}
    </div>
  );
}
