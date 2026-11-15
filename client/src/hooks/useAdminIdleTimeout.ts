import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const WARNING_SECONDS = 60;

export function useAdminIdleTimeout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_SECONDS);

  const idleTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const showWarningRef = useRef(false);

  const isAdmin = user?.role === 'admin';
  const timeoutMinutesRaw = Number((user as any)?.admin_idle_timeout_minutes ?? 15);
  const timeoutMinutes = Number.isFinite(timeoutMinutesRaw)
    ? Math.min(Math.max(timeoutMinutesRaw, 5), 120)
    : 15;

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const performAutoLogout = useCallback(async () => {
    clearTimers();
    showWarningRef.current = false;
    setShowWarning(false);
    await logout();
    navigate('/auth/login?reason=idle_timeout', { replace: true });
  }, [clearTimers, logout, navigate]);

  const scheduleIdleTimer = useCallback(() => {
    clearTimers();
    if (!isAdmin) return;

    const totalMs = timeoutMinutes * 60 * 1000;
    const warnBeforeMs = WARNING_SECONDS * 1000;
    const waitMs = Math.max(totalMs - warnBeforeMs, 10_000);

    idleTimerRef.current = window.setTimeout(() => {
      showWarningRef.current = true;
      setShowWarning(true);
      setSecondsLeft(WARNING_SECONDS);

      countdownIntervalRef.current = window.setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            void performAutoLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, waitMs);
  }, [clearTimers, isAdmin, timeoutMinutes, performAutoLogout]);

  const staySignedIn = useCallback(() => {
    showWarningRef.current = false;
    setShowWarning(false);
    setSecondsLeft(WARNING_SECONDS);
    scheduleIdleTimer();
  }, [scheduleIdleTimer]);

  useEffect(() => {
    if (!isAdmin) {
      clearTimers();
      showWarningRef.current = false;
      setShowWarning(false);
      return;
    }

    scheduleIdleTimer();

    const onActivity = () => {
      if (!showWarningRef.current) {
        scheduleIdleTimer();
      }
    };

    const events: (keyof WindowEventMap)[] = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));

    return () => {
      clearTimers();
      events.forEach((evt) => window.removeEventListener(evt, onActivity));
    };
  }, [isAdmin, scheduleIdleTimer, clearTimers]);

  return {
    showWarning,
    secondsLeft,
    staySignedIn,
    logoutNow: performAutoLogout,
  };
}

