import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTourStore } from '@/store/tourStore';
import { useAuthStore } from '@/store/authStore';
import { ALUMNI_TOUR_STEPS } from './tourSteps';
import SpotlightOverlay from './SpotlightOverlay';
import CoachMarkTooltip from './CoachMarkTooltip';

export default function AlumniOnboardingTour() {
  const { isActive, currentStepIndex, setUserId, startTour, nextStep, prevStep, skipTour, completeTour } = useTourStore();
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalSteps = ALUMNI_TOUR_STEPS.length;
  const currentStep = ALUMNI_TOUR_STEPS[currentStepIndex] || ALUMNI_TOUR_STEPS[0];

  // Sync logged in user ID to tour store
  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    }
  }, [user, setUserId]);

  // Auto-activate tour for first-time alumni when on dashboard '/'
  useEffect(() => {
    if (!user || user.role === 'admin') return;
    if (location.pathname !== '/') return;

    const storageKey = `ctu_alumni_ftue_completed_${user.id}`;
    const completed = localStorage.getItem(storageKey) === 'true';

    if (!completed && !isActive) {
      const timer = setTimeout(() => {
        startTour(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [user, location.pathname, isActive, startTour]);

  // Listen for manual trigger (e.g. from Header menu)
  useEffect(() => {
    const handleStartTour = () => {
      if (location.pathname !== '/') {
        navigate('/');
      }
      setTimeout(() => {
        startTour(true);
      }, 250);
    };

    window.addEventListener('start-alumni-tour', handleStartTour);
    return () => window.removeEventListener('start-alumni-tour', handleStartTour);
  }, [location.pathname, navigate, startTour]);

  // Update target bounding rect
  const updateRect = useCallback(() => {
    if (!isActive || !currentStep.targetSelector) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(currentStep.targetSelector);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isActive, currentStep]);

  // Step transition effect: route change, modal triggers, element polling
  useEffect(() => {
    if (!isActive) {
      setTargetRect(null);
      return;
    }

    // 1. Handle route transition if needed
    if (currentStep.route && location.pathname !== currentStep.route) {
      navigate(currentStep.route);
    }

    // 2. Handle modal actions
    if (currentStep.autoOpenEditModal) {
      window.dispatchEvent(new CustomEvent('tour-open-edit-profile'));
    }
    if (currentStep.switchEditSection) {
      window.dispatchEvent(new CustomEvent('tour-switch-edit-section', { detail: currentStep.switchEditSection }));
    }
    if (currentStep.autoCloseEditModal) {
      window.dispatchEvent(new CustomEvent('tour-close-edit-profile'));
    }

    if (!currentStep.targetSelector) {
      setTargetRect(null);
      return;
    }

    // 3. Poll for target element until rendered
    let attempts = 0;
    const maxAttempts = 20;

    const findAndMeasure = () => {
      const element = document.querySelector(currentStep.targetSelector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          const freshRect = element.getBoundingClientRect();
          setTargetRect(freshRect);
        }, 300);
      } else if (attempts < maxAttempts) {
        attempts++;
        pollTimerRef.current = setTimeout(findAndMeasure, 120);
      }
    };

    // Initial short pause to allow route / modal animation to start
    pollTimerRef.current = setTimeout(findAndMeasure, 150);

    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [isActive, currentStepIndex, currentStep, location.pathname, navigate]);

  // Handle window scroll & resize events
  useEffect(() => {
    if (!isActive) return;

    const handleScrollOrResize = () => {
      updateRect();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isActive, updateRect]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skipTour();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        nextStep(totalSteps);
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, nextStep, prevStep, skipTour, totalSteps]);

  if (!isActive) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9990] overflow-hidden pointer-events-none">
      <SpotlightOverlay targetRect={targetRect} padding={10} />
      <div className="pointer-events-auto">
        <CoachMarkTooltip
          step={currentStep}
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          targetRect={targetRect}
          onNext={() => nextStep(totalSteps)}
          onPrev={prevStep}
          onSkip={skipTour}
        />
      </div>
    </div>
  );
}

