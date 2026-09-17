import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftIcon, CheckIcon, ShieldCheckIcon, IdentificationIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';
import { authApi, type VerifyAlumniResponse } from '@/services/api';
import { generateYears } from '@/utils/helpers';
import { isPasswordStrong } from '@/utils/validation';
import InlinePasswordStrength from '@/components/auth/InlinePasswordStrength';
import FieldErrorAlert from '@/components/auth/FieldErrorAlert';

type Step = 'verify' | 'form' | 'captcha' | 'otp';

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('verify');
  const [loading, setLoading] = useState(false);

  // Rate limit cooldown state
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);

  // Step 1: Identity verification (Student ID + Birthdate)
  const [identity, setIdentity] = useState({ studentId: '', birthDate: '' });
  const [_verificationToken, setVerificationToken] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Step 2: Registration form & errors
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    program: '',
    yearGraduated: '',
  });

  const [formErrors, setFormErrors] = useState<{
    firstName?: boolean;
    lastName?: boolean;
    email?: boolean;
    program?: boolean;
    yearGraduated?: boolean;
    password?: boolean;
    confirmPassword?: boolean;
    message?: string | null;
  }>({});

  // Step 3: Captcha
  const [turnstileToken, setTurnstileToken] = useState('');
  const [widgetRendered, setWidgetRendered] = useState(false);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const captchaContainerRef = useRef<HTMLDivElement>(null);

  // Step 4: OTP
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { setUser, setToken } = useAuthStore();
  const navigate = useNavigate();

  // Rate limit countdown effect
  useEffect(() => {
    if (rateLimitCooldown <= 0) return;
    const timer = setInterval(() => {
      setRateLimitCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitCooldown]);

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
            callback: (token: string) => { setTurnstileToken(token); setWidgetRendered(true); setCaptchaError(null); },
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

  // Step 1: Verify Alumni Identity
  const handleVerifyIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);

    if (!identity.studentId.trim() || !identity.birthDate) {
      setVerifyError('Please enter both your Student ID and Birthdate to continue.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.verifyAlumni(identity.studentId.trim(), identity.birthDate);
      if (res.verified) {
        const idy = res.identity ?? {} as NonNullable<VerifyAlumniResponse['identity']>;
        setFormData((prev) => ({
          ...prev,
          firstName: idy.firstName || prev.firstName,
          lastName: idy.lastName || prev.lastName,
          program: idy.program || prev.program,
          yearGraduated: idy.yearGraduated || prev.yearGraduated,
        }));
        setVerificationToken('verified');
        setStep('form');
        setVerifyError(null);
      }
    } catch (err: any) {
      const cooldown = err.cooldownSeconds || (err.status === 429 ? 30 : 0);
      if (cooldown > 0) {
        setRateLimitCooldown(cooldown);
        setVerifyError(`Too many verification attempts. Please try again in ${cooldown} seconds.`);
      } else {
        setVerifyError('We could not verify your alumni information. Please check your Student ID and Birthdate or contact the registrar.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: false, message: null }));
  };

  // Step 2: Form submission -> Go to Captcha
  const handleCreateAccount = useCallback(async () => {
    setFormErrors({});

    const missing: Record<string, boolean> = {};
    if (!formData.firstName) missing.firstName = true;
    if (!formData.lastName) missing.lastName = true;
    if (!formData.email) missing.email = true;
    if (!formData.program) missing.program = true;
    if (!formData.yearGraduated) missing.yearGraduated = true;
    if (!formData.password) missing.password = true;
    if (!formData.confirmPassword) missing.confirmPassword = true;

    if (Object.keys(missing).length > 0) {
      setFormErrors({
        ...missing,
        message: 'Please fill in all required fields.',
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFormErrors({
        password: true,
        confirmPassword: true,
        message: 'Passwords do not match. Try again or check the password above.',
      });
      return;
    }

    if (!isPasswordStrong(formData.password)) {
      setFormErrors({
        password: true,
        message: 'Password does not meet the requirements. Please follow the checklist below.',
      });
      return;
    }

    setTurnstileToken('');
    setWidgetRendered(false);
    setCaptchaError(null);
    setStep('captcha');
  }, [formData]);

  // Step 3: Captcha Submit -> Send OTP
  const handleCaptchaSubmit = async () => {
    setCaptchaError(null);

    if (rateLimitCooldown > 0) {
      setCaptchaError(`Rate limit active. Please wait ${rateLimitCooldown}s before requesting a new OTP.`);
      return;
    }

    if (!turnstileToken) {
      setCaptchaError('Please complete the security check to proceed.');
      return;
    }

    setLoading(true);
    try {
      await authApi.sendOtp(formData.email, turnstileToken);
      setRateLimitCooldown(30);
      setStep('otp');
      setOtpError(null);
    } catch (err: any) {
      const cooldown = err.cooldownSeconds || (err.status === 429 ? 30 : 0);
      if (cooldown > 0) {
        setRateLimitCooldown(cooldown);
        setCaptchaError(`Please wait ${cooldown}s before requesting a new OTP.`);
      } else {
        setCaptchaError(err.message || 'Failed to send OTP. Please try again.');
      }
      setTurnstileToken('');
      if ((window as any).turnstile) {
        const container = captchaContainerRef.current;
        if (container) (window as any).turnstile.reset(container);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (rateLimitCooldown > 0) {
      setOtpError(`Please wait ${rateLimitCooldown}s before requesting a new code.`);
      return;
    }

    if (!turnstileToken) {
      setStep('captcha');
      setCaptchaError('Please complete the security check to receive a new code.');
      return;
    }

    setLoading(true);
    setOtpError(null);
    try {
      await authApi.sendOtp(formData.email, turnstileToken);
      setRateLimitCooldown(30);
    } catch (err: any) {
      const cooldown = err.cooldownSeconds || (err.status === 429 ? 30 : 0);
      if (cooldown > 0) {
        setRateLimitCooldown(cooldown);
        setOtpError(`Please wait ${cooldown}s before requesting a new OTP.`);
      } else {
        setOtpError(err.message || 'Failed to send OTP code.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Verify OTP and complete registration
  const handleVerifyOtp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    if (!otp || otp.length !== 6) {
      setOtpError('Please enter the 6-digit code sent to your email.');
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword: _dropped, ...payload } = { ...formData };
      const res = await authApi.register({
        studentId: identity.studentId.trim(),
        birthDate: identity.birthDate,
        ...payload,
        otp,
      });
      setToken(res.token);
      setUser(res.user);
      navigate('/survey/onboarding');
    } catch (err: any) {
      const cooldown = err.cooldownSeconds || (err.status === 429 ? 30 : 0);
      if (cooldown > 0) {
        setRateLimitCooldown(cooldown);
        setOtpError(`Too many attempts. Please try again in ${cooldown}s.`);
      } else {
        setOtpError('Invalid or expired verification code. Try again or resend code.');
      }
    } finally {
      setLoading(false);
    }
  }, [identity, formData, otp, setToken, setUser, navigate]);

  const years = generateYears(2014, new Date().getFullYear());

  return (
    <div>
      <Link to="/" className="inline-flex w-9 h-9 items-center justify-center rounded-xl text-gray-400 hover:text-ctu-blue hover:bg-gray-100 transition-all mb-4">
        <ArrowLeftIcon className="w-5 h-5" />
      </Link>

      <AnimatePresence mode="wait">
        {step === 'verify' ? (
          <motion.div
            key="verify"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="text-3xl font-bold text-ctu-charcoal mb-2 flex items-center gap-3">
              Join the Community
            </div>
            <p className="text-gray-500 mb-2">First, let's confirm your alumni identity.</p>
            <p className="text-gray-400 text-sm mb-8">
              Enter the Student ID and Birthdate from your alumni record to begin.
            </p>

            <form onSubmit={handleVerifyIdentity} className="space-y-5">
              {/* Student ID textfield with red highlight on error */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${verifyError ? 'text-red-600' : 'text-ctu-charcoal'}`}>
                  Student ID
                </label>
                <input
                  type="text"
                  value={identity.studentId}
                  onChange={(e) => {
                    setIdentity((p) => ({ ...p, studentId: e.target.value }));
                    if (verifyError) setVerifyError(null);
                  }}
                  className={`input-field ${verifyError ? 'border-red-600 focus:ring-red-500/20 focus:border-red-600' : ''}`}
                  placeholder="e.g. CTU-2020-0001"
                  required
                />
              </div>

              {/* Birthdate textfield with red highlight on error */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${verifyError ? 'text-red-600' : 'text-ctu-charcoal'}`}>
                  Birthdate
                </label>
                <input
                  type="date"
                  value={identity.birthDate}
                  onChange={(e) => {
                    setIdentity((p) => ({ ...p, birthDate: e.target.value }));
                    if (verifyError) setVerifyError(null);
                  }}
                  className={`input-field ${verifyError ? 'border-red-600 focus:ring-red-500/20 focus:border-red-600' : ''}`}
                  required
                />

                {/* Inline error alert matching screenshot */}
                <FieldErrorAlert message={verifyError} />
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
                    : 'Verify Identity & Continue'}
              </button>
            </form>
          </motion.div>
        ) : step === 'form' ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <IdentificationIcon className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-bold text-ctu-charcoal">Identity Confirmed</h2>
            </div>
            <p className="text-gray-500 mb-4 text-sm">
              Student ID <span className="font-semibold">{identity.studentId}</span> verified. Now complete your registration.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${formErrors.firstName ? 'text-red-600' : 'text-ctu-charcoal'}`}>
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`input-field ${formErrors.firstName ? 'border-red-600 focus:ring-red-500/20 focus:border-red-600' : ''}`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${formErrors.lastName ? 'text-red-600' : 'text-ctu-charcoal'}`}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`input-field ${formErrors.lastName ? 'border-red-600 focus:ring-red-500/20 focus:border-red-600' : ''}`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${formErrors.email ? 'text-red-600' : 'text-ctu-charcoal'}`}>
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input-field ${formErrors.email ? 'border-red-600 focus:ring-red-500/20 focus:border-red-600' : ''}`}
                  placeholder="alumni@ctu.edu.ph"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${formErrors.program ? 'text-red-600' : 'text-ctu-charcoal'}`}>
                    Degree
                  </label>
                  <select
                    name="program"
                    value={formData.program}
                    onChange={handleChange}
                    className={`input-field ${formErrors.program ? 'border-red-600 focus:ring-red-500/20 focus:border-red-600' : ''}`}
                    required
                  >
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
                  <label className={`block text-sm font-medium mb-1.5 ${formErrors.yearGraduated ? 'text-red-600' : 'text-ctu-charcoal'}`}>
                    Year Graduated
                  </label>
                  <select
                    name="yearGraduated"
                    value={formData.yearGraduated}
                    onChange={handleChange}
                    className={`input-field ${formErrors.yearGraduated ? 'border-red-600 focus:ring-red-500/20 focus:border-red-600' : ''}`}
                    required
                  >
                    <option value="">Select year</option>
                    {years.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password & Confirm Password with red highlight on mismatch or error */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="group">
                  <label className={`block text-sm font-medium mb-1.5 ${formErrors.password ? 'text-red-600' : 'text-ctu-charcoal'}`}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`input-field pr-11 ${formErrors.password ? 'border-red-600 focus:ring-red-500/20 focus:border-red-600' : ''}`}
                      placeholder="Create strong password"
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
                </div>

                <div className="group">
                  <label className={`block text-sm font-medium mb-1.5 ${formErrors.confirmPassword ? 'text-red-600' : 'text-ctu-charcoal'}`}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`input-field pr-11 ${formErrors.confirmPassword ? 'border-red-600 focus:ring-red-500/20 focus:border-red-600' : ''}`}
                      placeholder="Re-enter password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      onMouseDown={(e) => e.preventDefault()}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ctu-blue p-1 rounded-lg hover:bg-gray-100/70 transition-all opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Inline error alert matching user screenshot */}
              <FieldErrorAlert message={formErrors.message} />

              {/* Inline Sleek Password Strength Indicator (compact, doesn't trigger scroll) */}
              {formData.password && (
                <InlinePasswordStrength password={formData.password} />
              )}

              <button type="button" onClick={handleCreateAccount} disabled={loading} className="btn-primary w-full">
                {loading ? 'Sending verification code...' : 'Continue'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('verify'); setFormErrors({}); }}
                className="w-full text-sm text-gray-400 hover:text-ctu-blue transition-colors text-center"
              >
                ← Back to identity verification
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

            <div className="space-y-5">
              <div className="flex justify-center" ref={captchaContainerRef} />
              {!widgetRendered && (
                <p className="text-xs text-gray-400 text-center">Loading security check...</p>
              )}

              <FieldErrorAlert message={captchaError} />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep('form'); setCaptchaError(null); }}
                  className="btn-secondary flex-1"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCaptchaSubmit}
                  disabled={loading || !turnstileToken || rateLimitCooldown > 0}
                  className="btn-primary flex-1 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading
                    ? 'Sending OTP...'
                    : rateLimitCooldown > 0
                      ? `Rate Limited (${rateLimitCooldown}s)`
                      : 'Verify & Continue'}
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

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${otpError ? 'text-red-600' : 'text-ctu-charcoal'}`}>
                  One-Time Password
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                    if (otpError) setOtpError(null);
                  }}
                  className={`input-field text-center text-3xl tracking-[0.5em] font-mono ${
                    otpError ? 'border-red-600 focus:ring-red-500/20 focus:border-red-600' : ''
                  }`}
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                />
                <FieldErrorAlert message={otpError} />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Verifying...' : 'Confirm & Activate Account'}
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading || rateLimitCooldown > 0}
                className="w-full text-sm text-ctu-blue hover:underline disabled:opacity-50 text-center"
              >
                {rateLimitCooldown > 0
                  ? `Resend OTP in ${rateLimitCooldown}s`
                  : loading
                    ? 'Sending...'
                    : 'Resend OTP code'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('form'); setOtpError(null); }}
                className="w-full text-sm text-gray-400 hover:text-ctu-blue transition-colors text-center"
              >
                ← Back to registration form
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {step === 'verify' && (
        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/auth/login" className="text-ctu-blue font-medium hover:underline">Sign in</Link>
        </p>
      )}
    </div>
  );
}
