import { useEffect, useState } from 'react';
import { IdentificationIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { profileApi } from '@/services/api';
import { invalidateCachePrefixes } from '@/utils/apiCache';

export const ID_PROMPT_PREFIX = 'ctu_id_prompt_seen:';

export default function MissingIdNumberModal() {
  const { user, setUser } = useAuthStore();
  const addNotification = useUIStore((s) => s.addNotification);

  const [open, setOpen] = useState(false);
  const [idNumber, setIdNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'alumni' || user.survey_completed === false) return;

    const seenKey = `${ID_PROMPT_PREFIX}${user.id}`;
    if (sessionStorage.getItem(seenKey) === '1') return;

    const existingId = (user as any).profile?.id_number;
    if (existingId && String(existingId).trim()) {
      sessionStorage.setItem(seenKey, '1');
      return;
    }

    let cancelled = false;
    profileApi
      .get()
      .then((prof) => {
        if (cancelled) return;
        const dbId = String(prof?.id_number || '').trim();
        if (!dbId) {
          setOpen(true);
        } else {
          sessionStorage.setItem(seenKey, '1');
        }
      })
      .catch(() => {
        // Ignore transient errors; do not block navigation
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleDismiss = () => {
    if (user?.id) {
      sessionStorage.setItem(`${ID_PROMPT_PREFIX}${user.id}`, '1');
    }
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = idNumber.trim();
    if (!trimmed) {
      setError('Please enter your Student / Alumni ID number.');
      return;
    }
    if (trimmed.length > 10) {
      setError('ID number must be 10 characters or fewer (e.g. 2021-0001 or 1234567).');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await profileApi.update({ id_number: trimmed });
      invalidateCachePrefixes(['/profile']);
      window.dispatchEvent(new CustomEvent('ctu-profile-updated'));
      if (user) {
        sessionStorage.setItem(`${ID_PROMPT_PREFIX}${user.id}`, '1');
        setUser({
          ...user,
          profile: {
            ...((user as any).profile || {}),
            id_number: trimmed,
          },
        } as any);
      }
      addNotification('Student / Alumni ID number saved!', 'success');
      setOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to save ID number. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full p-5 sm:p-6 relative">
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <IdentificationIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Student / Alumni ID Required</h3>
            <p className="text-xs text-gray-500">One-time check for your alumni record</p>
          </div>
        </div>

        <p className="text-xs text-gray-600 mb-4 leading-relaxed">
          We noticed your Student / Alumni ID number is not yet on file. Please enter your ID number below so your academic and alumni records stay linked.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Student / Alumni ID Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={idNumber}
              onChange={(e) => {
                setIdNumber(e.target.value);
                if (error) setError('');
              }}
              maxLength={10}
              placeholder="e.g. 2021-0001 or 1234567"
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400"
            />
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleDismiss}
              disabled={saving}
              className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save ID Number'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

