import { create } from 'zustand';

const STORAGE_PREFIX = 'ctu_alumni_ftue_completed_';

function getStorageKey(userId?: string): string {
  return `${STORAGE_PREFIX}${userId || 'alumni'}`;
}

export interface TourState {
  isActive: boolean;
  currentStepIndex: number;
  userId: string | null;
  setUserId: (id: string | null) => void;
  startTour: (force?: boolean) => void;
  nextStep: (totalSteps: number) => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  skipTour: () => void;
  completeTour: () => void;
  resetTour: () => void;
}

export const useTourStore = create<TourState>((set, get) => ({
  isActive: false,
  currentStepIndex: 0,
  userId: null,

  setUserId: (id: string | null) => {
    set({ userId: id });
  },

  startTour: (force = false) => {
    const { userId } = get();
    const key = getStorageKey(userId || undefined);
    const completed = localStorage.getItem(key) === 'true';

    if (!force && completed) {
      return;
    }

    set({ isActive: true, currentStepIndex: 0 });
  },

  nextStep: (totalSteps: number) => {
    const { currentStepIndex } = get();
    if (currentStepIndex + 1 >= totalSteps) {
      get().completeTour();
    } else {
      set({ currentStepIndex: currentStepIndex + 1 });
    }
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },

  goToStep: (index: number) => {
    set({ currentStepIndex: Math.max(0, index) });
  },

  skipTour: () => {
    const { userId } = get();
    const key = getStorageKey(userId || undefined);
    localStorage.setItem(key, 'true');
    set({ isActive: false, currentStepIndex: 0 });
  },

  completeTour: () => {
    const { userId } = get();
    const key = getStorageKey(userId || undefined);
    localStorage.setItem(key, 'true');
    set({ isActive: false, currentStepIndex: 0 });
  },

  resetTour: () => {
    const { userId } = get();
    const key = getStorageKey(userId || undefined);
    localStorage.removeItem(key);
    set({ isActive: true, currentStepIndex: 0 });
  },
}));

