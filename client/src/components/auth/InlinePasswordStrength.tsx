import { motion } from 'framer-motion';
import { CheckIcon } from '@heroicons/react/24/outline';
import { checkPasswordCriteria } from '@/utils/validation';

export interface InlinePasswordStrengthProps {
  password: string;
  className?: string;
}

export default function InlinePasswordStrength({
  password,
  className = '',
}: InlinePasswordStrengthProps) {
  const criteria = checkPasswordCriteria(password);
  const passedCount = Object.values(criteria).filter(Boolean).length;

  const strengthConfig = [
    { label: 'Very Weak', color: 'bg-red-500', text: 'text-red-700', badgeBg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
    { label: 'Weak', color: 'bg-orange-500', text: 'text-orange-700', badgeBg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
    { label: 'Moderate', color: 'bg-amber-500', text: 'text-amber-700', badgeBg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
    { label: 'Good', color: 'bg-blue-500', text: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
    { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-700', badgeBg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  ];

  const currentConfig = strengthConfig[Math.max(0, passedCount - 1)] || strengthConfig[0];

  const requirements = [
    { id: 'minLength', label: 'At least 8 characters long', met: criteria.minLength },
    { id: 'hasNumber', label: 'At least one number (0-9)', met: criteria.hasNumber },
    { id: 'hasUpper', label: 'One uppercase letter (A-Z)', met: criteria.hasUpper },
    { id: 'hasSpecial', label: 'One special symbol (!@#$%^&*...)', met: criteria.hasSpecial },
    { id: 'hasLower', label: 'One lowercase letter (a-z)', met: criteria.hasLower },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`p-3 bg-gray-50/90 border border-gray-200 rounded-xl space-y-2.5 ${className}`}
    >
      {/* Top row: Label & Pill badge with indicator dot */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">Password Strength</span>
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${currentConfig.badgeBg} ${currentConfig.text}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${currentConfig.dot}`} />
          <span>{passedCount > 0 ? currentConfig.label : 'None'}</span>
        </div>
      </div>

      {/* Sleek and thin segmented bar */}
      <div className="flex items-center gap-1.5 w-full">
        {[1, 2, 3, 4, 5].map((index) => {
          const isFilled = index <= passedCount;
          const segmentColor =
            index === 1 ? 'bg-red-500' :
            index === 2 ? 'bg-orange-500' :
            index === 3 ? 'bg-amber-500' :
            index === 4 ? 'bg-blue-500' : 'bg-emerald-500';

          return (
            <div
              key={index}
              className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
                isFilled ? segmentColor : 'bg-gray-200'
              }`}
            />
          );
        })}
      </div>

      {/* Compact 2-column checklist with circular badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 pt-0.5 text-[11px]">
        {requirements.map((req) => (
          <div
            key={req.id}
            className={`flex items-center gap-2 transition-colors duration-150 ${
              req.met ? 'text-gray-800 font-medium' : 'text-gray-400'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                req.met
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 bg-transparent'
              }`}
            >
              {req.met ? (
                <CheckIcon className="w-2.5 h-2.5 stroke-[3]" />
              ) : (
                <span className="w-1 h-1 rounded-full bg-transparent" />
              )}
            </div>
            <span className="truncate">{req.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
