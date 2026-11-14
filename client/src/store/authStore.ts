import { create } from 'zustand';
import { User } from '@/types';
import { authApi } from '@/services/api';
import { clearAllCache } from '@/utils/apiCache';

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
  logout: (allDevices?: boolean) => Promise<void>;
  syncToken: () => boolean;
}

function clearIdPromptFlags() {
  try {
    Object.keys(sessionStorage).forEach((k) => {
      if (k.startsWith('ctu_id_prompt_seen:')) sessionStorage.removeItem(k);
    });
  } catch {}
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: getStoredToken(),
  loading: true,
  setUser: (user) => set({ user }),
  setToken: (token, persist = true) => {
    clearAllCache();
    clearIdPromptFlags();
    setStoredToken(token, persist);
    set({ token });
  },
  setLoading: (loading) => set({ loading }),
  logout: async (allDevices = false) => {
    try {
      const token = getStoredToken();
      if (token) {
        await authApi.logout(allDevices);
      }
    } catch (err) {
      console.warn('[authStore] Backend logout notification failed (local session cleared):', err);
    } finally {
      clearAllCache();
      clearIdPromptFlags();
      removeStoredToken();
      set({ user: null, token: null });
    }
  },
  syncToken: () => {
    const stored = getStoredToken();
    let changed = false;
    set((state) => {
      if (stored !== state.token) {
        changed = true;
        clearAllCache();
        return { token: stored, user: stored ? null : null, loading: stored ? true : false };
      }
      return {};
    });
    return changed;
  },
}));
