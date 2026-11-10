import { create } from 'zustand';
import { TourStep, ALUMNI_TOUR_STEPS, getPageTourSteps } from '@/components/tour/tourSteps';

const STORAGE_PREFIX = 'ctu_alumni_ftue_v2_';

export function getStorageKey(userId?: string): string {
  return `${STORAGE_PREFIX}${userId || 'alumni'}`;
}

export interface TourState {
  isActive: boolean;
  showAlumiIntro: boolean;
  currentStepIndex: number;
  userId: string | null;
  activeSteps: TourStep[];
  setUserId: (id: string | null) => void;
  startTour: (force?: boolean, customSteps?: TourStep[]) => void;
  startPageTour: (pathname: string) => void;
  startWalkthrough: () => void;
  nextStep: (totalSteps?: number) => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  skipTour: () => void;
  completeTour: () => void;
  resetTour: () => void;
}

export const useTourStore = create<TourState>((set, get) => ({
  isActive: false,
  showAlumiIntro: true,
  currentStepIndex: 0,
  userId: null,
  activeSteps: ALUMNI_TOUR_STEPS,

  setUserId: (id: string | null) => {
    set({ userId: id });
  },

  startTour: (force = false, customSteps?: TourStep[]) => {
    const { userId } = get();
    const key = getStorageKey(userId || undefined);
    const completed = localStorage.getItem(key) === 'true';

    if (!force && completed && !customSteps) {
      return;
    }

    set({
      isActive: true,
      showAlumiIntro: customSteps ? false : true,
      currentStepIndex: 0,
      activeSteps: customSteps || ALUMNI_TOUR_STEPS,
    });
  },

  startPageTour: (pathname: string) => {
    const steps = getPageTourSteps(pathname);
    set({
      isActive: true,
      showAlumiIntro: false,
      currentStepIndex: 0,
      activeSteps: steps,
    });
  },

  startWalkthrough: () => {
    set({ showAlumiIntro: false, currentStepIndex: 0 });
  },

  nextStep: (totalSteps?: number) => {
    const { currentStepIndex, activeSteps } = get();
    const steps = activeSteps && activeSteps.length > 0 ? activeSteps : ALUMNI_TOUR_STEPS;
    const count = totalSteps || steps.length;
    if (currentStepIndex + 1 >= count) {
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
    const { userId, activeSteps } = get();
    if (!activeSteps || activeSteps === ALUMNI_TOUR_STEPS) {
      const key = getStorageKey(userId || undefined);
      localStorage.setItem(key, 'true');
    }
    set({ isActive: false, showAlumiIntro: false, currentStepIndex: 0, activeSteps: [] });
  },

  completeTour: () => {
    const { userId, activeSteps } = get();
    if (!activeSteps || activeSteps === ALUMNI_TOUR_STEPS) {
      const key = getStorageKey(userId || undefined);
      localStorage.setItem(key, 'true');
    }
    set({ isActive: false, showAlumiIntro: false, currentStepIndex: 0, activeSteps: [] });
  },

  resetTour: () => {
    const { userId } = get();
    const key = getStorageKey(userId || undefined);
    localStorage.removeItem(key);
    if (userId) {
      localStorage.removeItem(`ctu_alumni_ftue_completed_${userId}`);
    }
    set({ isActive: true, showAlumiIntro: true, currentStepIndex: 0, activeSteps: ALUMNI_TOUR_STEPS });
  },
}));
