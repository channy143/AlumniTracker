import { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import { UserGroupIcon, DocumentTextIcon, XMarkIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'accepted', label: 'Qualified / Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  reviewed: 'bg-blue-100 text-blue-700',
  shortlisted: 'bg-purple-100 text-purple-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

function statusLabel(status?: string): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label || 'Pending';
}

interface ScreeningModalProps {
  jobId: string;
  jobPosition: string;
  jobCompany: string;
  onClose: () => void;
}

export default function ScreeningModal({ jobId, jobPosition, jobCompany, onClose }: ScreeningModalProps) {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const addNotification = useUIStore((s) => s.addNotification);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    adminApi.jobApplicants(jobId)
      .then((res) => {
        if (!cancelled) setApplicants(Array.isArray(res) ? res : []);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load applicants. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [jobId]);

  const handleStatusChange = async (applicationId: string, status: string) => {
    setUpdatingId(applicationId);
    try {
      await adminApi.jobUpdateApplicantStatus(applicationId, status);
      setApplicants((prev) => prev.map((a) => (a.id === applicationId ? { ...a, status } : a)));
      addNotification(`Application marked as ${statusLabel(status)}`, 'success');
    } catch {
      addNotification('Failed to update application status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Screen Applicants</h2>
            <p className="text-xs text-gray-500">{jobPosition} — {jobCompany}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg animate-pulse h-20" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-xs">{error}</div>
          ) : applicants.length === 0 ? (
            <div className="text-center py-12">
              <UserGroupIcon className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">No applicants yet for this opportunity.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applicants.map((app: any) => (
                <div key={app.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center text-xs font-bold text-orange-600 shrink-0 uppercase">
                        {(app.applicant_name || '?').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{app.applicant_name || 'Applicant'}</p>
                        <p className="text-[11px] text-gray-500">Applied {new Date(app.applied_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[app.status] || STATUS_COLORS.pending}`}>
                      {statusLabel(app.status)}
                    </span>
                  </div>

                  {app.cover_letter && (
                    <p className="text-xs text-gray-600 mt-2 bg-gray-50 rounded-lg p-2 line-clamp-3">{app.cover_letter}</p>
                  )}

                  <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
                    <div className="flex items-center gap-3 text-xs">
                      {app.resume_url ? (
                        <a href={app.resume_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-orange-600 hover:underline font-medium">
                          <DocumentTextIcon className="w-3.5 h-3.5" /> View Resume
                        </a>
                      ) : (
                        <span className="text-gray-400 text-[11px]">No resume</span>
                      )}
                      {app.applicant_email && (
                        <a href={`mailto:${app.applicant_email}`} className="flex items-center gap-1 text-gray-500 hover:underline">
                          <EnvelopeIcon className="w-3.5 h-3.5" /> {app.applicant_email}
                        </a>
                      )}
                    </div>
                    <select
                      value={app.status}
                      disabled={updatingId === app.id}
                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-orange-400 disabled:opacity-50"
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
