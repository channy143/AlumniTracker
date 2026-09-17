import React from 'react';
import {
  ShieldCheckIcon,
  XMarkIcon,
  CircleStackIcon,
  ChartBarIcon,
  ArrowLeftOnRectangleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';

interface SecurityPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityPolicyModal: React.FC<SecurityPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50/50 via-white to-orange-50/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600">
              <ShieldCheckIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Institutional Security &amp; Data Privacy Policy</h2>
              <p className="text-xs text-gray-500">
                Republic Act No. 10173 (Data Privacy Act of 2012) &amp; Institutional Security Guidelines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-gray-700 leading-relaxed">
          {/* Secure Database Management */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
              <CircleStackIcon className="w-5 h-5 text-blue-600" />
              <span>Secure Database Management</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-blue-950/85 pl-1">
              <li>Alumni information must be stored through the system's centralized database.</li>
              <li>Administrators must avoid keeping unnecessary copies of alumni records in unsecured files.</li>
              <li>Data must be protected from accidental deletion, alteration, loss, and unauthorized access.</li>
              <li>The system specifically uses Supabase for cloud database, authentication, and backend services with enforced Row Level Security (RLS).</li>
            </ul>
          </div>

          {/* Proper Use of Reports and Analytics */}
          <div className="rounded-xl border border-purple-100 bg-purple-50/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
              <ChartBarIcon className="w-5 h-5 text-purple-600" />
              <span>Proper Use of Reports and Analytics</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-purple-950/85 pl-1">
              <li>Career analytics and reports must only be accessed by authorized users.</li>
              <li>Reports containing alumni personal information must not be shared with unauthorized individuals.</li>
              <li>Exported reports must be handled securely with mandatory audit logging and confidentiality notices.</li>
              <li>The system generates career analytics and reports based on alumni employment and survey data for institutional improvement.</li>
            </ul>
          </div>

          {/* Secure Logout and Account Protection */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <ArrowLeftOnRectangleIcon className="w-5 h-5 text-emerald-600" />
              <span>Secure Logout and Account Protection</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-emerald-950/85 pl-1">
              <li>Users must log out after using the system, especially on shared computers.</li>
              <li>Users must not leave their accounts accessible to other people.</li>
              <li>Any suspicious or unauthorized account activity should be reported immediately to the administrator.</li>
              <li>The system includes a secure logout function for terminating active sessions and blacklisting tokens.</li>
            </ul>
          </div>

          {/* Who Does What */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
              <UserGroupIcon className="w-5 h-5 text-orange-500" />
              <span>Who Does What? Responsibilities Matrix</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/60">
                <span className="font-semibold text-xs text-orange-600 uppercase tracking-wider block mb-1">
                  Alumni Responsibility
                </span>
                <p className="text-xs text-gray-600">
                  Protect their account, keep information accurate, avoid sharing credentials, and properly log out after every session.
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/60">
                <span className="font-semibold text-xs text-orange-600 uppercase tracking-wider block mb-1">
                  Administrator Responsibility
                </span>
                <p className="text-xs text-gray-600">
                  Manage alumni records responsibly, control authorized access, protect reports and analytics, and maintain the security of stored information.
                </p>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 italic">
              Both users must protect personal information and avoid unauthorized access or disclosure. This follows the Data Privacy Act's requirement for reasonable and appropriate organizational, physical, and technical security measures.
            </p>
          </div>

          {/* Consequences of Violations */}
          <div className="rounded-xl border border-red-200 bg-red-50/40 p-4 space-y-2">
            <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              <span>Consequences of Violations</span>
            </div>
            <p className="text-xs text-red-950 font-medium">
              Violations of this policy include:
            </p>
            <ul className="list-disc list-inside text-xs text-red-900/80 space-y-0.5 pl-1">
              <li>Sharing account passwords.</li>
              <li>Accessing another user's account without permission.</li>
              <li>Accessing or sharing alumni information without authorization.</li>
              <li>Altering or deleting records without permission.</li>
              <li>Improperly sharing reports containing personal information.</li>
            </ul>
            <div className="pt-2 border-t border-red-200/60 flex items-start gap-2 text-[11px] text-red-800">
              <ScaleIcon className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>
                Depending on the violation, access may be suspended or restricted, and the incident may be reported to the appropriate institutional authority. Unauthorized access or disclosure of personal information may also carry legal consequences under the <strong>Data Privacy Act of 2012 (RA 10173)</strong>.
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            CTU-Naga Alumni Connect Compliance Framework
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors shadow-2xs"
          >
            I Understand &amp; Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};
