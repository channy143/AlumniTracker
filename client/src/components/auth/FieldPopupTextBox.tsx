import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationCircleIcon,
  ClockIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export type PopupType = 'error' | 'warning' | 'rate-limit' | 'info';

export interface FieldPopupTextBoxProps {
  message: string | null;
  type?: PopupType;
  title?: string;
  cooldownSeconds?: number;
  onClose?: () => void;
  onCooldownEnd?: () => void;
  position?: 'top' | 'bottom';
  className?: string;
}

export default function FieldPopupTextBox({
  message,
  type = 'error',
  title,
  cooldownSeconds = 0,
  onClose,
  onCooldownEnd,
  position = 'top',
  className = '',
}: FieldPopupTextBoxProps) {
  const [remaining, setRemaining] = useState(cooldownSeconds);
  const initialTotalRef = useRef(cooldownSeconds);

  useEffect(() => {
    setRemaining(cooldownSeconds);
    if (cooldownSeconds > 0) {
      initialTotalRef.current = cooldownSeconds;
    }
  }, [cooldownSeconds]);

  // Rate limiter countdown
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onCooldownEnd?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining, onCooldownEnd]);

  if (!message) return null;

  const isRateLimit = type === 'rate-limit' || remaining > 0;
  const effectiveType: PopupType = isRateLimit ? 'rate-limit' : type;

  const styles = {
    error: {
      card: 'bg-white dark:bg-slate-900 border-red-300 dark:border-red-700/70 text-red-900 dark:text-red-100 shadow-red-500/10',
      iconBg: 'bg-red-100 text-red-600 dark:bg-red-950/80 dark:text-red-400',
      icon: ExclamationCircleIcon,
      arrow: 'border-red-300 dark:border-red-700 bg-white dark:bg-slate-900',
      progress: 'bg-red-500',
      defaultTitle: 'Authentication Error',
    },
    warning: {
      card: 'bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700/70 text-amber-900 dark:text-amber-100 shadow-amber-500/10',
      iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400',
      icon: ExclamationCircleIcon,
      arrow: 'border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900',
      progress: 'bg-amber-500',
      defaultTitle: 'Notice',
    },
    'rate-limit': {
      card: 'bg-white dark:bg-slate-900 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-100 shadow-amber-500/20',
      iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300',
      icon: ClockIcon,
      arrow: 'border-amber-400 dark:border-amber-600 bg-white dark:bg-slate-900',
      progress: 'bg-amber-500',
      defaultTitle: 'Rate Limit Active',
    },
    info: {
      card: 'bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 shadow-blue-500/10',
      iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400',
      icon: InformationCircleIcon,
      arrow: 'border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900',
      progress: 'bg-blue-500',
      defaultTitle: 'Information',
    },
  }[effectiveType];

  const Icon = styles.icon;
  const displayTitle = title || styles.defaultTitle;
  const total = initialTotalRef.current || 1;
  const progressPercent = Math.max(0, Math.min(100, ((total - remaining) / total) * 100));

  return (
    <AnimatePresence>
      <motion.div
        role="alert"
        initial={{ opacity: 0, y: position === 'top' ? 10 : -10, scale: 0.96 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          x: [0, -3, 3, -2, 2, 0], // Subtle attention shake on pop up
        }}
        exit={{ opacity: 0, y: position === 'top' ? 8 : -8, scale: 0.96 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className={`absolute left-0 right-0 z-40 rounded-2xl border shadow-2xl backdrop-blur-md overflow-hidden ${styles.card} ${
          position === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'
        } ${className}`}
      >
        <div className="p-3.5 flex items-start gap-3">
          {/* Icon */}
          <div className={`p-1.5 rounded-xl shrink-0 ${styles.iconBg} relative mt-0.5`}>
            <Icon className="w-4 h-4" />
            {isRateLimit && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
            )}
          </div>

          {/* Text Message */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold tracking-tight">{displayTitle}</span>
              {remaining > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                  {remaining}s
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed font-medium opacity-90">{message}</p>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 -mr-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
            aria-label="Dismiss message"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Cooldown progress bar */}
        {remaining > 0 && (
          <div className="w-full h-1 bg-amber-100 dark:bg-amber-950 overflow-hidden">
            <div
              className={`h-full ${styles.progress} transition-all duration-1000 ease-linear`}
              style={{ width: `${100 - progressPercent}%` }}
            />
          </div>
        )}

        {/* Triangle arrow pointing towards the textfield */}
        <div
          className={`absolute left-8 w-3 h-3 rotate-45 border ${styles.arrow} ${
            position === 'top'
              ? '-bottom-1.5 border-t-0 border-l-0'
              : '-top-1.5 border-b-0 border-r-0'
          }`}
        />
      </motion.div>
    </AnimatePresence>
  );
}
