import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTourStore } from '@/store/tourStore';
import { useAuthStore } from '@/store/authStore';
import { ALUMNI_TOUR_STEPS } from './tourSteps';
import SpotlightOverlay from './SpotlightOverlay';
import CoachMarkTooltip from './CoachMarkTooltip';
import AlumiIntroScene from './AlumiIntroScene';

export default function AlumniOnboardingTour() {
  const { isActive, showAlumiIntro, startWalkthrough, currentStepIndex, setUserId, startTour, nextStep, prevStep, skipTour } = useTourStore();
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalSteps = ALUMNI_TOUR_STEPS.length;
  const currentStep = ALUMNI_TOUR_STEPS[currentStepIndex] || ALUMNI_TOUR_STEPS[0];

  // Sync user ID
  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    }
  }, [user, setUserId]);

  // Auto-activate tour for first-time alumni on dashboard '/'
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

  // Listen for manual trigger (e.g. from Header dropdown)
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

  // Update target bounding rect smoothly
  const updateRect = useCallback(() => {
    if (!isActive || !currentStep.targetSelector) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(currentStep.targetSelector);
    if (element) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(rect);
        return;
      }
    }
    setTargetRect(null);
  }, [isActive, currentStep]);

  // Measure and scroll target without shaking layout
  useEffect(() => {
    if (!isActive || showAlumiIntro) {
      setTargetRect(null);
      return;
    }

    // 1. Ensure correct route
    if (currentStep.route && location.pathname !== currentStep.route) {
      navigate(currentStep.route);
    }

    if (!currentStep.targetSelector) {
      setTargetRect(null);
      return;
    }

    // 2. Poll for target element
    let attempts = 0;
    const maxAttempts = 25;

    const findAndMeasure = () => {
      const element = document.querySelector(currentStep.targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();

        // If element is hidden (e.g., hidden mobile sidebar), fallback to centered modal
        if (rect.width === 0 || rect.height === 0) {
          setTargetRect(null);
          return;
        }

        // Only vertically scroll window if target is partially off-screen
        const isOffscreen = rect.top < 80 || rect.bottom > window.innerHeight - 80;
        if (isOffscreen) {
          const targetY = window.scrollY + rect.top - 140;
          window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
          setTimeout(() => {
            const freshRect = element.getBoundingClientRect();
            setTargetRect(freshRect);
          }, 300);
        } else {
          setTargetRect(rect);
        }
      } else if (attempts < maxAttempts) {
        attempts++;
        pollTimerRef.current = setTimeout(findAndMeasure, 100);
      } else {
        setTargetRect(null);
      }
    };

    pollTimerRef.current = setTimeout(findAndMeasure, 120);

    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [isActive, currentStepIndex, currentStep, location.pathname, navigate]);

  // Window resize and scroll sync
  useEffect(() => {
    if (!isActive) return;

    const handleSync = () => {
      updateRect();
    };

    window.addEventListener('resize', handleSync);
    window.addEventListener('scroll', handleSync, true);

    return () => {
      window.removeEventListener('resize', handleSync);
      window.removeEventListener('scroll', handleSync, true);
    };
  }, [isActive, updateRect]);

  // Keyboard navigation
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

  // Render Alumi's big intro scene before Step 1 starts
  if (showAlumiIntro) {
    return createPortal(
      <AlumiIntroScene onStart={startWalkthrough} onSkip={skipTour} />,
      document.body
    );
  }

  // Render directly in document.body at top-most z-index
  return createPortal(
    <div className="fixed inset-0 z-[100000] overflow-hidden pointer-events-none">
      <SpotlightOverlay targetRect={targetRect} padding={8} />
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
    </div>,
    document.body
  );
}
