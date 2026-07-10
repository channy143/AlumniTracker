import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  notifications: Notification[];
  addNotification: (messageOrNotification: string | Notification, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeNotification: (id: string) => void;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  notifications: [],
  addNotification: (messageOrNotification, type) =>
    set((state) => {
      const notification = typeof messageOrNotification === 'string'
        ? { id: Date.now().toString(), message: messageOrNotification, type: type || 'info' }
        : messageOrNotification;
      return { notifications: [...state.notifications, notification] };
    }),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
