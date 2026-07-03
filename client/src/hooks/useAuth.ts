import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api';

export function useAuth() {
  const { user, token, loading, setUser, setLoading, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (token && !user) {
      authApi
        .me()
        .then((res) => setUser(res.user))
        .catch(() => {
          logout();
          navigate('/auth/login');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  return { user, loading, logout };
}
