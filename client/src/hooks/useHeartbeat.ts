import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { messagesApi } from '@/services/api';
import { setBackgroundInterval } from '@/utils/helpers';

export function useHeartbeat() {
  const token = useAuthStore((state) => state.token);
  const lastHeartbeatRef = useRef<number>(0);

  useEffect(() => {
    if (!token) return;

    const sendHeartbeat = async () => {
      // If client browser is offline (internet dropped), do not attempt
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;

      const now = Date.now();
      // Throttle heartbeats to minimum 12 seconds apart
      if (now - lastHeartbeatRef.current < 12000) return;
      lastHeartbeatRef.current = now;
      try {
        await messagesApi.heartbeat();
      } catch {
        // Silently ignore network hiccup
      }
    };

    // Immediate initial heartbeat upon mount/auth
    sendHeartbeat();

    // Regular pulse interval: every 20 seconds even when window is in background
    const stopInterval = setBackgroundInterval(() => {
      if (navigator.onLine) {
        sendHeartbeat();
      }
    }, 20000);

    // Active user interactions (clicks, keypresses, scrolls) trigger heartbeat
    const handleUserInteraction = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        sendHeartbeat();
      }
    };

    // Promptly send heartbeat when switching tabs or focusing window
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        sendHeartbeat();
      }
    };

    // Internet connectivity drop and restoration handlers
    const handleOnline = () => {
      sendHeartbeat();
    };

    const handleOffline = () => {
      // Internet lost: send offline signal if possible or note state
      messagesApi.offline();
    };

    // Tab/Window close or navigation away: notify server immediately
    const handlePageUnload = () => {
      messagesApi.offline();
    };

    const interactionEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    interactionEvents.forEach((ev) => window.addEventListener(ev, handleUserInteraction, { passive: true }));

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeunload', handlePageUnload);
    window.addEventListener('pagehide', handlePageUnload);

    return () => {
      stopInterval();
      interactionEvents.forEach((ev) => window.removeEventListener(ev, handleUserInteraction));
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeunload', handlePageUnload);
      window.removeEventListener('pagehide', handlePageUnload);
      // Also send offline if unmounting due to logout
      handlePageUnload();
    };
  }, [token]);
}
