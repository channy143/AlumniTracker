import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';

function purgeLegacyTokens() {
  try {
    localStorage.removeItem('access_token');
    sessionStorage.removeItem('access_token');
  } catch {
    // ignore storage errors
  }
}

export function useAuth() {
  const { user, setUser, setToken, logout } = useAuthStore();
  const [checking, setChecking] = useState<boolean>(user === null);
  const calledRef = useRef(false);

  useEffect(() => {
    purgeLegacyTokens();

    if (user !== null) {
      setChecking(false);
      return;
    }

    if (calledRef.current) return;
    calledRef.current = true;
    setChecking(true);

    authApi
      .me()
      .then((res) => {
        if (res?.user) {
          setToken('httponly');
          setUser(res.user);
        } else {
          setToken(undefined);
          setUser(null);
        }
      })
      .catch(() => {
        setToken(undefined);
        setUser(null);
      })
      .finally(() => {
        setChecking(false);
      });
  }, [user, setUser, setToken]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'ctu_auth_logout') {
        setUser(null);
        setToken(undefined);
        setChecking(false);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, [setUser, setToken]);

  return { user, loading: checking && user === null, logout };
}
