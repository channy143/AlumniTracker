import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CheckCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { checkPasswordCriteria } from '@/utils/validation';

export interface PasswordStrengthPopupProps {
  password: string;
  visible: boolean;
  onClose?: () => void;
  className?: string;
}

export default function PasswordStrengthPopup({
  password,
  visible,
  onClose,
  className = '',
}: PasswordStrengthPopupProps) {
  if (!visible) return null;

  const criteria = checkPasswordCriteria(password);
  const passedCount = Object.values(criteria).filter(Boolean).length;

  const strengthLabel =
    passedCount === 5 ? 'Strong' :
    passedCount >= 4 ? 'Good' :
    passedCount >= 3 ? 'Moderate' :
    passedCount >= 2 ? 'Weak' : 'Very Weak';

  const strengthColor =
    passedCount === 5 ? 'bg-green-500' :
    passedCount >= 4 ? 'bg-blue-500' :
    passedCount >= 3 ? 'bg-amber-500' :
    passedCount >= 2 ? 'bg-orange-500' : 'bg-red-500';

  const textColor =
    passedCount === 5 ? 'text-green-700 dark:text-green-400' :
    passedCount >= 4 ? 'text-blue-700 dark:text-blue-400' :
    passedCount >= 3 ? 'text-amber-700 dark:text-amber-400' :
    passedCount >= 2 ? 'text-orange-700 dark:text-orange-400' : 'text-red-700 dark:text-red-400';

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-label="Password Strength Requirements"
        initial={{ opacity: 0, y: -8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`absolute left-0 right-0 sm:left-auto sm:right-0 sm:w-80 top-full mt-2.5 z-40 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl space-y-3 ${className}`}
      >
        {/* Triangle arrow pointing up towards password input */}
        <div className="absolute right-12 -top-1.5 w-3 h-3 rotate-45 border border-gray-200 dark:border-gray-700 border-b-0 border-r-0 bg-white dark:bg-slate-900" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-4 h-4 text-ctu-blue" />
            <span className="text-xs font-semibold text-ctu-charcoal dark:text-gray-100">
              Password Strength
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${textColor}`}>
              {strengthLabel}
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 -mr-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                aria-label="Close strength guide"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Animated Progress Track */}
        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${strengthColor}`}
            initial={false}
            animate={{ width: `${(passedCount / 5) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Requirements Checklist */}
        <div className="space-y-1.5 pt-1 text-[11px]">
          <div className={`flex items-center gap-2 transition-colors ${criteria.minLength ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${criteria.minLength ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
            <span>At least 8 characters long</span>
          </div>
          <div className={`flex items-center gap-2 transition-colors ${criteria.hasUpper ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${criteria.hasUpper ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
            <span>One uppercase letter (A-Z)</span>
          </div>
          <div className={`flex items-center gap-2 transition-colors ${criteria.hasLower ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${criteria.hasLower ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
            <span>One lowercase letter (a-z)</span>
          </div>
          <div className={`flex items-center gap-2 transition-colors ${criteria.hasNumber ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${criteria.hasNumber ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
            <span>At least one number (0-9)</span>
          </div>
          <div className={`flex items-center gap-2 transition-colors ${criteria.hasSpecial ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${criteria.hasSpecial ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
            <span>One special symbol (!@#$%^&*...)</span>
          </div>
        </div>

        {passedCount === 5 && (
          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-green-600 dark:text-green-400 font-semibold">
            <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0" />
            <span>Strong password! Ready to proceed.</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
