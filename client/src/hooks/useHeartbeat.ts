import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { messagesApi } from '@/services/api';

export function useHeartbeat() {
  const token = useAuthStore((state) => state.token);
  const lastHeartbeatRef = useRef<number>(0);

  useEffect(() => {
    if (!token) return;

    const sendHeartbeat = async () => {
      const now = Date.now();
      // Throttle heartbeats to minimum 10 seconds apart
      if (now - lastHeartbeatRef.current < 10000) return;
      lastHeartbeatRef.current = now;
      try {
        await messagesApi.heartbeat();
      } catch {
        // Silently ignore network hiccup
      }
    };

    // Immediate initial heartbeat upon mounting/session available
    sendHeartbeat();

    // Regular interval: every 30 seconds while page is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    }, 30000);

    // Heartbeat promptly when user switches back to this tab or focuses window
    const handleActivity = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleActivity);
    window.addEventListener('focus', handleActivity);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleActivity);
      window.removeEventListener('focus', handleActivity);
    };
  }, [token]);
}
