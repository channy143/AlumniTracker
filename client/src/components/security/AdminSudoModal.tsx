import { useEffect, useState } from 'react';
import { ShieldCheckIcon, LockClosedIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { authApi } from '@/services/api';

interface SudoEventDetail {
  resolve: (verified: boolean) => void;
}

export default function AdminSudoModal() {
  const [resolver, setResolver] = useState<((verified: boolean) => void) | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<SudoEventDetail>;
      if (custom.detail?.resolve) {
        setPassword('');
        setError('');
        setResolver(() => custom.detail.resolve);
      }
    };
    window.addEventListener('auth:sudo-required', handler);
    return () => window.removeEventListener('auth:sudo-required', handler);
  }, []);

  if (!resolver) return null;

  const handleCancel = () => {
    if (submitting) return;
    const resolve = resolver;
    setResolver(null);
    setPassword('');
    setError('');
    resolve(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your administrator password.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await authApi.sudoVerify(password);
      const resolve = resolver;
      setResolver(null);
      setPassword('');
      resolve(true);
    } catch (err: any) {
      setError(err?.message || 'Incorrect password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <ShieldCheckIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Confirm Administrator Password</h3>
              <p className="text-xs text-slate-500">Step-up verification for sensitive action</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Cancel verification"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            For your security, please re-enter your password to continue with this privileged action.
            Your verification will stay active for 10 minutes.
          </p>

          <div>
            <label htmlFor="admin-sudo-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Administrator Password
            </label>
            <div className="relative">
              <LockClosedIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="admin-sudo-password"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                placeholder="Enter your password"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ctu-blue/25 focus:border-ctu-blue"
              />
            </div>
            {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-ctu-blue hover:bg-ctu-blue/90 disabled:opacity-60 rounded-xl transition-colors"
            >
              {submitting ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

