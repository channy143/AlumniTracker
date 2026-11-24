import { create } from 'zustand';
import { User } from '@/types';
import { authApi } from '@/services/api';
import { clearAllCache } from '@/utils/apiCache';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token?: string, persist?: boolean) => void;
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

function clearLegacyTokens() {
  try {
    localStorage.removeItem('access_token');
    sessionStorage.removeItem('access_token');
  } catch {}
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: true,
  setUser: (user) => {
    try {
      if (user?.id) sessionStorage.setItem('ctu_cache_uid', String(user.id));
      else sessionStorage.removeItem('ctu_cache_uid');
    } catch {}
    set({ user, loading: false });
    window.dispatchEvent(new Event('recently-viewed-changed'));
  },
  setToken: (_token?: string, _persist = true) => {
    clearAllCache();
    clearIdPromptFlags();
    clearLegacyTokens();
    set({ token: 'httponly' });
  },
  setLoading: (loading) => set({ loading }),
  logout: async (allDevices = false) => {
    try {
      await authApi.logout(allDevices);
    } catch (err) {
      console.warn('[authStore] Backend logout notification failed (local session cleared):', err);
    } finally {
      clearAllCache();
      clearIdPromptFlags();
      clearLegacyTokens();
      try {
        sessionStorage.removeItem('ctu_cache_uid');
        localStorage.setItem('ctu_auth_logout', String(Date.now()));
      } catch {}
      set({ user: null, token: null, loading: false });
      window.dispatchEvent(new Event('recently-viewed-changed'));
    }
  },
  syncToken: () => false,
}));
