import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTourStore, getStorageKey } from '@/store/tourStore';
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

  // Expose handy window helper for testing
  useEffect(() => {
    (window as any).resetAlumniTour = () => {
      if (user?.id) {
        localStorage.removeItem(getStorageKey(user.id));
        localStorage.removeItem(`ctu_alumni_ftue_completed_${user.id}`);
      }
      startTour(true);
    };
  }, [user, startTour]);

  // Auto-activate tour for first-time alumni on dashboard '/'
  useEffect(() => {
    if (!user || user.role === 'admin') return;
    if (location.pathname !== '/') return;

    const searchParams = new URLSearchParams(window.location.search);
    const forceParam = searchParams.get('tour') === '1' || searchParams.get('tour') === 'true' || searchParams.get('reset_tour') === '1';

    const storageKey = getStorageKey(user.id);
    const completed = localStorage.getItem(storageKey) === 'true';

    if ((!completed || forceParam) && !isActive) {
      const timer = setTimeout(() => {
        startTour(forceParam);
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

  // Measure and scroll target with fluid zero-latency tracking
  useEffect(() => {
    if (!isActive || showAlumiIntro) {
      setTargetRect(null);
      return;
    }

    // 1. Ensure correct route
    if (currentStep.route && location.pathname !== currentStep.route) {
      navigate(currentStep.route);
    }

    // Sync tab and modal on Profile page
    if (currentStep.route === '/profile') {
      if (currentStep.id === 'profile-privacy-tab') {
        window.dispatchEvent(new CustomEvent('tour-close-edit-profile'));
        window.dispatchEvent(new CustomEvent('tour-switch-profile-tab', { detail: 'privacy' }));
      } else if (currentStep.id === 'profile-edit-modal-status' || currentStep.id === 'profile-edit-modal-proof') {
        window.dispatchEvent(new CustomEvent('tour-open-edit-profile'));
      } else {
        window.dispatchEvent(new CustomEvent('tour-close-edit-profile'));
        window.dispatchEvent(new CustomEvent('tour-switch-profile-tab', { detail: 'overview' }));
      }
    }

    if (!currentStep.targetSelector) {
      setTargetRect(null);
      return;
    }

    // 2. Poll for target element (immediate first attempt, fast follow-up)
    let attempts = 0;
    const maxAttempts = 30;

    const findAndMeasure = () => {
      const element = document.querySelector(currentStep.targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();

        // If element is hidden (e.g., hidden mobile sidebar), fallback to centered modal
        if (rect.width === 0 || rect.height === 0) {
          setTargetRect(null);
          return;
        }

        // Determine optimal scroll alignment so tooltip has maximum room without collision
        let scrollBlock: ScrollLogicalPosition = 'center';
        if (currentStep.pointingDirection === 'bottom') {
          scrollBlock = 'start';
        } else if (currentStep.pointingDirection === 'top') {
          scrollBlock = 'end';
        } else {
          scrollBlock = 'center';
        }

        // Scroll target comfortably into view if outside comfortable viewport bounds
        const isOffscreen = rect.top < 70 || rect.bottom > window.innerHeight - 70;
        if (isOffscreen) {
          try {
            element.scrollIntoView({ behavior: 'smooth', block: scrollBlock, inline: 'nearest' });
          } catch {
            const targetY = window.scrollY + rect.top - 140;
            window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
          }
        }

        // Immediately update targetRect with ZERO artificial delay
        setTargetRect(rect);
      } else if (attempts < maxAttempts) {
        attempts++;
        pollTimerRef.current = setTimeout(findAndMeasure, 30);
      } else {
        setTargetRect(null);
      }
    };

    // Execute immediately on the exact same frame!
    findAndMeasure();

    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [isActive, currentStepIndex, currentStep, location.pathname, navigate]);

  // Window resize and continuous 60fps scroll sync during smooth scrolling
  useEffect(() => {
    if (!isActive) return;

    let rafId: number | null = null;
    const handleSync = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        updateRect();
      });
    };

    window.addEventListener('resize', handleSync, { passive: true });
    window.addEventListener('scroll', handleSync, { passive: true, capture: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleSync);
      window.removeEventListener('scroll', handleSync, true);
    };
  }, [isActive, updateRect]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('tour-close-edit-profile'));
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

  // When user clicks the "Edit Profile" button directly on the page, advance to the modal guide!
  useEffect(() => {
    if (!isActive) return;

    const handleEditClicked = () => {
      if (currentStep.id === 'profile-edit-btn') {
        nextStep(totalSteps);
      }
    };

    window.addEventListener('tour-edit-profile-clicked', handleEditClicked);
    return () => window.removeEventListener('tour-edit-profile-clicked', handleEditClicked);
  }, [isActive, currentStep, nextStep, totalSteps]);

  const handleSkipTour = useCallback(() => {
    window.dispatchEvent(new CustomEvent('tour-close-edit-profile'));
    skipTour();
  }, [skipTour]);

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
          onSkip={handleSkipTour}
        />
      </div>
    </div>,
    document.body
  );
}
