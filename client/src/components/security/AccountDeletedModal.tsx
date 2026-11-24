import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExclamationTriangleIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

interface AccountDeletedDetail {
  code?: 'ACCOUNT_DELETED' | 'ACCOUNT_DISABLED';
  message?: string;
}

export const AccountDeletedModal: React.FC = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const addNotification = useUIStore((s) => s.addNotification);

  const [isOpen, setIsOpen] = useState(false);
  const [detail, setDetail] = useState<AccountDeletedDetail>({});
  const [showReportForm, setShowReportForm] = useState(false);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleAccountDeleted = (event: Event) => {
      const custom = event as CustomEvent<AccountDeletedDetail>;
      setDetail(custom.detail || {});
      setIsOpen(true);
    };

    window.addEventListener('auth:account-deleted', handleAccountDeleted);
    return () => {
      window.removeEventListener('auth:account-deleted', handleAccountDeleted);
    };
  }, []);

  if (!isOpen) return null;

  const isDisabled = detail.code === 'ACCOUNT_DISABLED';
  const title = isDisabled
    ? 'Account Deactivated by Administrator'
    : 'Account Deleted by Administrator';
  const bodyMessage =
    detail.message ||
    (isDisabled
      ? 'Your account has been deactivated or archived by an administrator.'
      : 'Your account was deleted by an administrator.');

  const finishAndLogout = async () => {
    setSubmitting(true);
    try {
      await logout();
    } finally {
      setSubmitting(false);
      setIsOpen(false);
      setShowReportForm(false);
      setDescription('');
      setError('');
      navigate('/', { replace: true });
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = description.trim();
    if (!trimmed) {
      setError('Please describe your concern before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await authApi.reportDeletedAccount(trimmed);
      addNotification('Your report has been submitted to the administrators.', 'success');
      await finishAndLogout();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit report. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[20020] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-deleted-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-red-50/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
            {showReportForm ? (
              <ShieldExclamationIcon className="w-5 h-5" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <h2 id="account-deleted-title" className="text-base font-bold text-gray-900">
              {showReportForm ? 'File a Report' : title}
            </h2>
            <p className="text-xs text-gray-500">Session Terminated</p>
          </div>
        </div>

        {!showReportForm ? (
          <div className="p-6 space-y-5">
            <p className="text-sm text-gray-700 leading-relaxed">
              {bodyMessage} You will be signed out and returned to the landing page.
            </p>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setError('');
                  setShowReportForm(true);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                File a Report
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={finishAndLogout}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Signing out...' : 'Okay'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitReport} className="p-6 space-y-4">
            <p className="text-xs text-gray-600 leading-relaxed">
              Explain why you believe this account removal was a mistake or unauthorized. After submitting, you will be signed out and returned to the landing page.
            </p>
            <div>
              <label htmlFor="deleted-account-report" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Report Details
              </label>
              <textarea
                id="deleted-account-report"
                rows={4}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Describe what happened or provide details for the administrator..."
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                disabled={submitting}
              />
              {error && <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>}
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setShowReportForm(false);
                  setError('');
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Report & Sign Out'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AccountDeletedModal;

