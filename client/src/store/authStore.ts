import { create } from 'zustand';
import { User } from '@/types';

const STORAGE_KEY = 'access_token';

const getStoredToken = () => localStorage.getItem(STORAGE_KEY);

function setStoredToken(token: string, _persist: boolean) {
  localStorage.setItem(STORAGE_KEY, token);
}

function removeStoredToken() {
  localStorage.removeItem(STORAGE_KEY);
}

interface AuthState {
  user: (User & { role: 'admin' | 'staff' | 'alumni' }) | null;
  token: string | null;
  loading: boolean;
  setUser: (user: User & { role: 'admin' | 'staff' | 'alumni' }) => void;
  setToken: (token: string, persist?: boolean) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  syncToken: () => boolean;
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
  syncToken: () => {
    const stored = getStoredToken();
    let changed = false;
    set((state) => {
      if (stored !== state.token) {
        changed = true;
        return { token: stored, user: stored ? null : null, loading: stored ? true : false };
      }
      return {};
    });
    return changed;
  },
}));
