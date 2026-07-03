import { create } from 'zustand';
import { User } from '@/types';

const getStoredToken = () =>
  sessionStorage.getItem('access_token') || localStorage.getItem('access_token');

function setStoredToken(token: string, persist: boolean) {
  if (persist) {
    localStorage.setItem('access_token', token);
    sessionStorage.removeItem('access_token');
  } else {
    sessionStorage.setItem('access_token', token);
    localStorage.removeItem('access_token');
  }
}

function removeStoredToken() {
  localStorage.removeItem('access_token');
  sessionStorage.removeItem('access_token');
}

interface AuthState {
  user: (User & { role: 'admin' | 'staff' | 'alumni' }) | null;
  token: string | null;
  loading: boolean;
  setUser: (user: User & { role: 'admin' | 'staff' | 'alumni' }) => void;
  setToken: (token: string, persist?: boolean) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: getStoredToken(),
  loading: true,
  setUser: (user) => set({ user }),
  setToken: (token, persist = true) => {
    setStoredToken(token, persist);
    set({ token });
  },
  setLoading: (loading) => set({ loading }),
  logout: () => {
    removeStoredToken();
    set({ user: null, token: null });
  },
}));
