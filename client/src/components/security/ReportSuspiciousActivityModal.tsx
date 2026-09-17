import React, { useState } from 'react';
import {
  ShieldExclamationIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { authApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';

interface ReportSuspiciousActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportSuspiciousActivityModal: React.FC<ReportSuspiciousActivityModalProps> = ({
  isOpen,
  onClose,
}) => {
  const addNotification = useUIStore((s) => s.addNotification);
  const [incidentType, setIncidentType] = useState('suspicious_login');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      addNotification('Please describe the suspicious activity.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await authApi.reportIncident({
        incidentType,
        description: description.trim(),
        severity,
      });
      setSubmitted(true);
      addNotification('Security report submitted to administrators.', 'success');
    } catch (err: any) {
      addNotification(err.message || 'Failed to submit incident report.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setDescription('');
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-red-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600">
              <ShieldExclamationIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Report Suspicious Activity</h2>
              <p className="text-[11px] text-gray-500">
                Account Protection &bull; Direct Administrator Alert
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircleIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Report Filed Successfully</h3>
              <p className="text-xs text-gray-600 mt-1 max-w-sm mx-auto">
                Thank you for protecting our community. An immutable incident record has been created, and institutional administrators have been alerted.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Type of Suspicious Activity
              </label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="w-full text-xs rounded-xl border border-gray-200 px-3 py-2 bg-gray-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="suspicious_login">Suspicious Login / Unknown Device</option>
                <option value="unauthorized_access">Attempted Unauthorized Account Access</option>
                <option value="password_sharing">Account Credential Compromise</option>
                <option value="data_tampering">Unexpected Record Deletion or Alteration</option>
                <option value="unauthorized_report_sharing">Unauthorized Report Sharing / Data Leak</option>
                <option value="shared_computer_unlogged">Shared Computer Left Logged In</option>
                <option value="other">Other Security Concern</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Perceived Urgency / Severity
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSeverity(lvl)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider border transition-all ${
                      severity === lvl
                        ? lvl === 'high'
                          ? 'bg-red-500 text-white border-red-500'
                          : lvl === 'medium'
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Detailed Description of Incident
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
                placeholder="Describe what happened, including any dates, times, devices, or suspicious actions noticed..."
                className="w-full text-xs rounded-xl border border-gray-200 p-3 bg-gray-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
              <span className="text-[10px] text-gray-400">
                Your IP address and device information will be securely logged for investigation.
              </span>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-2xs disabled:opacity-50"
              >
                {submitting ? 'Submitting Report...' : 'Submit Incident Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
