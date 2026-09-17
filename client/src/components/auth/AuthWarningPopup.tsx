import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  ClockIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export type AuthWarningType = 'warning' | 'error' | 'rate-limit' | 'info';

export interface AuthWarningPopupProps {
  message: string | null;
  title?: string;
  type?: AuthWarningType;
  cooldownSeconds?: number;
  onClose?: () => void;
  onCooldownEnd?: () => void;
  autoDismissMs?: number;
}

export default function AuthWarningPopup({
  message,
  title,
  type = 'warning',
  cooldownSeconds = 0,
  onClose,
  onCooldownEnd,
  autoDismissMs = 6000,
}: AuthWarningPopupProps) {
  const [remaining, setRemaining] = useState(cooldownSeconds);
  const totalCooldownRef = useRef(cooldownSeconds);

  // Update remaining whenever cooldownSeconds changes
  useEffect(() => {
    setRemaining(cooldownSeconds);
    if (cooldownSeconds > 0) {
      totalCooldownRef.current = cooldownSeconds;
    }
  }, [cooldownSeconds]);

  // Handle active rate limit cooldown countdown
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

  // Handle auto-dismiss for non-cooldown warnings
  useEffect(() => {
    if (!message || remaining > 0 || autoDismissMs <= 0) return;

    const dismissTimer = setTimeout(() => {
      onClose?.();
    }, autoDismissMs);

    return () => clearTimeout(dismissTimer);
  }, [message, remaining, autoDismissMs, onClose]);

  if (!message) return null;

  const isRateLimited = (type === 'rate-limit' || remaining > 0);
  const effectiveType: AuthWarningType = isRateLimited ? 'rate-limit' : type;

  const themeConfig = {
    'rate-limit': {
      border: 'border-amber-400/80 bg-amber-50/95 text-amber-950 shadow-amber-500/15',
      iconBg: 'bg-amber-100 text-amber-700',
      icon: ClockIcon,
      defaultTitle: 'Rate Limit Active',
      progressBg: 'bg-amber-500',
    },
    warning: {
      border: 'border-amber-300 bg-amber-50/95 text-amber-900 shadow-amber-500/10',
      iconBg: 'bg-amber-100 text-amber-600',
      icon: ExclamationTriangleIcon,
      defaultTitle: 'Warning',
      progressBg: 'bg-amber-400',
    },
    error: {
      border: 'border-red-200 bg-red-50/95 text-red-900 shadow-red-500/10',
      iconBg: 'bg-red-100 text-red-600',
      icon: ShieldExclamationIcon,
      defaultTitle: 'Authentication Notice',
      progressBg: 'bg-red-500',
    },
    info: {
      border: 'border-blue-200 bg-blue-50/95 text-blue-900 shadow-blue-500/10',
      iconBg: 'bg-blue-100 text-blue-600',
      icon: InformationCircleIcon,
      defaultTitle: 'Notice',
      progressBg: 'bg-blue-500',
    },
  }[effectiveType];

  const IconComponent = themeConfig.icon;
  const displayTitle = title || themeConfig.defaultTitle;

  // Calculate percentage of cooldown elapsed
  const total = totalCooldownRef.current || 1;
  const progressPercent = Math.max(0, Math.min(100, ((total - remaining) / total) * 100));

  return (
    <AnimatePresence>
      <motion.div
        key="auth-warning-popup"
        role="alert"
        aria-live="polite"
        initial={{ opacity: 0, y: -24, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.94 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 rounded-2xl border shadow-xl backdrop-blur-md overflow-hidden ${themeConfig.border}`}
      >
        <div className="p-4 flex items-start gap-3.5">
          {/* Icon */}
          <div className={`p-2 rounded-xl shrink-0 ${themeConfig.iconBg} relative`}>
            <IconComponent className="w-5 h-5" />
            {isRateLimited && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
            )}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className="text-sm font-semibold tracking-tight">{displayTitle}</h4>
              {remaining > 0 && (
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-amber-200/90 text-amber-900 animate-pulse">
                  {remaining}s
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed opacity-90 break-words">{message}</p>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 -mr-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-black/5 transition-colors shrink-0"
            aria-label="Dismiss warning"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Live Cooldown Progress Indicator */}
        {remaining > 0 && (
          <div className="w-full h-1 bg-amber-200/60 overflow-hidden">
            <div
              className={`h-full ${themeConfig.progressBg} transition-all duration-1000 ease-linear`}
              style={{ width: `${100 - progressPercent}%` }}
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
