import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
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
  });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser, setToken } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateAccount = useCallback(async () => {
    setError('');

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.program || !formData.yearGraduated || !formData.password) {
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

    setLoading(true);
    try {
      await authApi.sendOtp(formData.email);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }, [formData]);

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
