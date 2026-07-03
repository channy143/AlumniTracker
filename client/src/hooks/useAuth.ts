import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api';

export function useAuth() {
  const { user, token, setUser, setLoading, logout } = useAuthStore();
  const navigate = useNavigate();
  const calledRef = useRef(false);

  useEffect(() => {
    if (token && !user && !calledRef.current) {
      calledRef.current = true;
      authApi
        .me()
        .then((res) => setUser(res.user))
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else if (!token) {
      setLoading(false);
    }
  }, [token]);

  return { user, loading: user === null && token !== null, logout };
}
