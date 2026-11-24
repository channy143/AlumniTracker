import { ClockIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

interface AdminIdleTimeoutModalProps {
  open: boolean;
  secondsLeft: number;
  onStaySignedIn: () => void;
  onLogoutNow: () => void;
}

export default function AdminIdleTimeoutModal({
  open,
  secondsLeft,
  onStaySignedIn,
  onLogoutNow,
}: AdminIdleTimeoutModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[20010] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-amber-50/70 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
            <ClockIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Admin Session Timeout</h3>
            <p className="text-xs text-slate-600">Inactivity protection</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            You have been inactive for a while. To protect administrator access, you will be signed out automatically in{' '}
            <span className="font-bold text-amber-700 tabular-nums">{secondsLeft}s</span>.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onLogoutNow}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
              Sign Out
            </button>
            <button
              type="button"
              onClick={onStaySignedIn}
              className="px-4 py-2 text-sm font-semibold text-white bg-ctu-blue hover:bg-ctu-blue/90 rounded-xl transition-colors"
            >
              Stay Signed In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

