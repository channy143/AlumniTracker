import React, { useMemo } from 'react';
import { XMarkIcon, ChevronLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { TourStep } from './tourSteps';

interface CoachMarkTooltipProps {
  step: TourStep;
  currentStepIndex: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export default function CoachMarkTooltip({
  step,
  currentStepIndex,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onSkip,
}: CoachMarkTooltipProps) {
  const isFinalStep = currentStepIndex === totalSteps - 1;
  const isFirstStep = currentStepIndex === 0;

  // Collision-Avoidance Placement Solver
  // Guarantees the modal NEVER covers or overlays targetRect
  const placement = useMemo(() => {
    if (!targetRect || step.pointingDirection === 'none') {
      return {
        style: {
          position: 'fixed' as const,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: '440px',
          width: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 32px)',
          zIndex: 100000,
        },
        direction: 'none' as const,
      };
    }

    const margin = 16;
    const tooltipWidth = Math.min(390, window.innerWidth - 32);
    // Generous estimate of tooltip height including padding, badge, title, content, buttons
    const estimatedHeight = isFinalStep ? 360 : 310;
    const vpWidth = window.innerWidth;
    const vpHeight = window.innerHeight;

    // Helper: checks whether candidate tooltip box overlaps targetRect
    const collides = (x: number, y: number): boolean => {
      const boxLeft = x;
      const boxRight = x + tooltipWidth;
      const boxTop = y;
      const boxBottom = y + estimatedHeight;

      // Expand target by small margin for safety
      const safeTargetLeft = targetRect.left - 8;
      const safeTargetRight = targetRect.right + 8;
      const safeTargetTop = targetRect.top - 8;
      const safeTargetBottom = targetRect.bottom + 8;

      const overlapX = boxLeft < safeTargetRight && boxRight > safeTargetLeft;
      const overlapY = boxTop < safeTargetBottom && boxBottom > safeTargetTop;

      return overlapX && overlapY;
    };

    // Helper: checks whether candidate fits cleanly in visible viewport
    const fitsViewport = (x: number, y: number): boolean => {
      return (
        x >= 12 &&
        x + tooltipWidth <= vpWidth - 12 &&
        y >= 12 &&
        y + estimatedHeight <= vpHeight - 12
      );
    };

    // Candidate generator for each direction
    const getCandidate = (direction: 'top' | 'bottom' | 'left' | 'right') => {
      let x = 0;
      let y = 0;

      if (direction === 'bottom') {
        x = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        y = targetRect.bottom + margin;
      } else if (direction === 'top') {
        x = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        y = targetRect.top - estimatedHeight - margin;
      } else if (direction === 'left') {
        x = targetRect.left - tooltipWidth - margin;
        y = targetRect.top + targetRect.height / 2 - estimatedHeight / 2;
      } else if (direction === 'right') {
        x = targetRect.right + margin;
        y = targetRect.top + targetRect.height / 2 - estimatedHeight / 2;
      }

      // Clamp into viewport
      const clampedX = Math.max(12, Math.min(vpWidth - tooltipWidth - 12, x));
      const clampedY = Math.max(12, Math.min(vpHeight - estimatedHeight - 12, y));

      return { x: clampedX, y: clampedY, rawX: x, rawY: y, direction };
    };

    // Order candidate directions based on preferred direction
    const pref = step.pointingDirection;
    let dirOrder: ('bottom' | 'top' | 'left' | 'right')[] = ['bottom', 'top', 'right', 'left'];

    if (pref === 'left') {
      dirOrder = ['left', 'top', 'bottom', 'right'];
    } else if (pref === 'right') {
      dirOrder = ['right', 'top', 'bottom', 'left'];
    } else if (pref === 'top') {
      dirOrder = ['top', 'bottom', 'left', 'right'];
    } else if (pref === 'bottom') {
      dirOrder = ['bottom', 'top', 'left', 'right'];
    }

    // 1. Try to find a direction where it fits viewport AND has ZERO COLLISION with target
    let chosen: { x: number; y: number; direction: 'top' | 'bottom' | 'left' | 'right' } | null = null;
    for (const dir of dirOrder) {
      const cand = getCandidate(dir);
      if (fitsViewport(cand.rawX, cand.rawY) && !collides(cand.x, cand.y)) {
        chosen = cand;
        break;
      }
    }

    // 2. If raw doesn't fit without clamping, try clamped versions that have ZERO collision
    if (!chosen) {
      for (const dir of dirOrder) {
        const cand = getCandidate(dir);
        if (!collides(cand.x, cand.y)) {
          chosen = cand;
          break;
        }
      }
    }

    // 3. Fallback: if element is huge and covers almost entire viewport, pick the position
    // with the least overlap, or place at the screen edge opposite the target center
    if (!chosen) {
      const targetCenterY = targetRect.top + targetRect.height / 2;
      if (targetCenterY > vpHeight / 2) {
        // Target is in lower half of screen -> place at top
        chosen = { x: Math.max(12, Math.min(vpWidth - tooltipWidth - 12, targetRect.left)), y: 16, direction: 'top' as const };
      } else {
        // Target is in upper half of screen -> place at bottom
        chosen = { x: Math.max(12, Math.min(vpWidth - tooltipWidth - 12, targetRect.left)), y: vpHeight - estimatedHeight - 16, direction: 'bottom' as const };
      }
    }

    return {
      style: {
        position: 'fixed' as const,
        top: `${chosen.y}px`,
        left: `${chosen.x}px`,
        width: `${tooltipWidth}px`,
        maxHeight: 'calc(100vh - 32px)',
        zIndex: 100000,
        transition: 'top 0.24s cubic-bezier(0.16, 1, 0.3, 1), left 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      direction: chosen.direction,
    };
  }, [targetRect, step.pointingDirection, isFinalStep]);

  // Dynamic hand arrow pointing at the highlighted target
  const getPointerEmoji = () => {
    if (placement.direction === 'bottom') return '👆'; // Tooltip is below -> points UP at target
    if (placement.direction === 'top') return '👇';    // Tooltip is above -> points DOWN at target
    if (placement.direction === 'left') return '👉';   // Tooltip is to the left -> points RIGHT at target
    if (placement.direction === 'right') return '👈';  // Tooltip is to the right -> points LEFT at target
    return '🎯';
  };

  return (
    <div
      style={placement.style}
      className="bg-white rounded-2xl shadow-2xl border border-orange-200/90 overflow-y-auto max-h-[calc(100vh-32px)] select-none text-left animate-in zoom-in-95 fade-in duration-200 scrollbar-none"
    >
      {/* Top gradient progress line */}
      <div className="h-1.5 w-full bg-orange-100/70 overflow-hidden shrink-0">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300 rounded-r-full"
          style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
        />
      </div>

      <div className="p-4 sm:p-5">
        {/* If celebration step, show Alumi happily celebrating */}
        {isFinalStep && (
          <div className="flex justify-center -mt-1 mb-3">
            <img
              src="/image/mascot.png"
              alt="Alumi Celebrating"
              className="w-24 sm:w-32 h-auto object-contain drop-shadow-lg"
            />
          </div>
        )}

        {/* Meta Bar: Badge, Step Counter, Close Button */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200 flex items-center gap-1">
              <div className="w-4 h-4 rounded-full overflow-hidden bg-orange-200 ring-1 ring-orange-300 shrink-0">
                <img src="/image/mascot.png" alt="Alumi" className="w-full h-full object-cover scale-125" />
              </div>
              <span>{step.badge}</span>
            </span>

            <span className="text-[11px] font-bold text-gray-500">
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
          </div>

          <button
            type="button"
            onClick={onSkip}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Close Tutorial"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <h2 className="text-sm sm:text-base font-extrabold text-gray-900 leading-snug mb-1.5">
          {step.title}
        </h2>

        {/* Content */}
        <p className="text-xs text-gray-600 leading-relaxed mb-3">
          {step.content}
        </p>

        {/* Pointing Coach Direction Indicator */}
        {step.pointingDirection !== 'none' && targetRect && (
          <div className="flex items-center gap-2 mb-3 px-2.5 py-1.5 bg-orange-50 border border-orange-100 rounded-lg text-[11px] text-orange-800 font-medium">
            <span className="animate-bounce inline-block text-sm">
              {getPointerEmoji()}
            </span>
            <span>Highlighted on your screen</span>
          </div>
        )}

        {/* Step dot indicator pills */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStepIndex
                  ? 'w-6 bg-orange-500'
                  : i < currentStepIndex
                  ? 'w-1.5 bg-orange-200'
                  : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <div>
            {!isFinalStep && (
              <button
                type="button"
                onClick={onSkip}
                className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors cursor-pointer px-1 py-1"
              >
                Skip Tour
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isFirstStep && !isFinalStep && (
              <button
                type="button"
                onClick={onPrev}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <ChevronLeftIcon className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 transition-all cursor-pointer active:scale-95"
            >
              <span>{step.actionText || (isFinalStep ? 'Get Started' : 'Next Step')}</span>
              {!isFinalStep && <ArrowRightIcon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
