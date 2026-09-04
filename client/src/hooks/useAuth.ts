import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api';

const clearToken = () => localStorage.removeItem('access_token');

function decodeToken(token: string): { userId: string; email: string; role: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.userId || !payload.email || !payload.role) return null;
    return { userId: payload.userId, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function useAuth() {
  const { user, token, setUser, setLoading, logout, syncToken } = useAuthStore();
  const calledRef = useRef(false);

  useEffect(() => {
    if (token && !user && !calledRef.current) {
      calledRef.current = true;

      // Decode JWT locally to restore session without server roundtrip
      if (isTokenExpired(token)) {
        clearToken();
        logout();
        setLoading(false);
        return;
      }

      const decoded = decodeToken(token);
      if (!decoded) {
        clearToken();
        logout();
        setLoading(false);
        return;
      }

      setUser({
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role as 'admin' | 'staff' | 'alumni',
        is_verified: false,
        created_at: '',
      } as any);

      // Background-fetch full user info — ignore failure (session already restored)
      authApi.me().then((res) => {
        if (res?.user) setUser(res.user);
      }).catch(() => {});

      setLoading(false);
    } else if (!token) {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'access_token' && syncToken()) {
        calledRef.current = false;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && syncToken()) {
        calledRef.current = false;
      }
    };
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [syncToken]);

  return { user, loading: user === null && token !== null, logout };
}