import { useState } from 'react';
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

  const { setUser, setToken } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.login(email, password);
      setToken(res.token, rememberMe);
      setUser(res.user);
      navigate(res.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

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
            type="email"
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
