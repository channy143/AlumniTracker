import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_WINDOW_MS = 60 * 1000; // 1 minute warning

interface UseIdleTimerOptions {
  timeoutMs?: number;
  warningMs?: number;
  onTimeout?: () => void;
}

export function useIdleTimer(options: UseIdleTimerOptions = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, warningMs = WARNING_WINDOW_MS, onTimeout } = options;
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [isWarningActive, setIsWarningActive] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(Math.round(warningMs / 1000));

  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (isWarningActive) {
      setIsWarningActive(false);
      setSecondsRemaining(Math.round(warningMs / 1000));
    }
  }, [isWarningActive, warningMs]);

  useEffect(() => {
    if (!user) {
      setIsWarningActive(false);
      return;
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    const handleEvent = () => resetActivity();

    events.forEach((evt) => window.addEventListener(evt, handleEvent, { passive: true }));

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const warningThreshold = timeoutMs - warningMs;

      if (elapsed >= timeoutMs) {
        // Log out immediately
        setIsWarningActive(false);
        if (onTimeout) {
          onTimeout();
        } else {
          logout(false);
        }
      } else if (elapsed >= warningThreshold) {
        setIsWarningActive(true);
        const remaining = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
        setSecondsRemaining(remaining);
      } else {
        if (isWarningActive) {
          setIsWarningActive(false);
        }
      }
    }, 1000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleEvent));
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user, timeoutMs, warningMs, logout, onTimeout, resetActivity, isWarningActive]);

  return {
    isWarningActive,
    secondsRemaining,
    resetActivity,
  };
}
