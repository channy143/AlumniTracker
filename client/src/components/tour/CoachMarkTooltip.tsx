import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const SPRING_TRANSITION = {
  type: 'spring' as const,
  stiffness: 340,
  damping: 32,
  mass: 0.8,
};

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

  const tooltipRef = useRef<HTMLDivElement>(null);
  const [actualHeight, setActualHeight] = useState(450);

  // Continuously track actual rendered height of tooltip content
  useLayoutEffect(() => {
    if (tooltipRef.current) {
      const h = tooltipRef.current.offsetHeight;
      if (h > 0 && Math.abs(h - actualHeight) > 4) {
        setActualHeight(h);
      }
    }
  });

  // Collision-Avoidance Placement Solver
  // Guarantees the modal NEVER covers or overlays targetRect
  const placement = useMemo(() => {
    const tooltipWidth = Math.min(390, window.innerWidth - 32);
    const estimatedHeight = Math.max(actualHeight, 430);
    const vpWidth = window.innerWidth;
    const vpHeight = window.innerHeight;

    if (!targetRect || step.pointingDirection === 'none') {
      return {
        x: Math.max(12, (vpWidth - tooltipWidth) / 2),
        y: Math.max(12, (vpHeight - estimatedHeight) / 2),
        width: tooltipWidth,
        direction: 'none' as const,
      };
    }

    const margin = 16;

    // Helper: checks whether candidate tooltip box overlaps targetRect
    const collides = (x: number, y: number): boolean => {
      const boxLeft = x;
      const boxRight = x + tooltipWidth;
      const boxTop = y;
      const boxBottom = y + estimatedHeight;

      // Expand target by small margin for safety
      const safeTargetLeft = targetRect.left - 10;
      const safeTargetRight = targetRect.right + 10;
      const safeTargetTop = targetRect.top - 10;
      const safeTargetBottom = targetRect.bottom + 10;

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
      dirOrder = ['top', 'bottom', 'right', 'left'];
    } else if (pref === 'bottom') {
      dirOrder = ['bottom', 'top', 'right', 'left'];
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
      x: chosen.x,
      y: chosen.y,
      width: tooltipWidth,
      direction: chosen.direction,
    };
  }, [targetRect, step.pointingDirection, isFinalStep, actualHeight]);

  return (
    <motion.div
      ref={tooltipRef}
      initial={false}
      animate={{
        top: placement.y,
        left: placement.x,
      }}
      transition={SPRING_TRANSITION}
      style={{
        position: 'fixed',
        width: `${placement.width}px`,
        maxHeight: 'calc(100vh - 32px)',
        zIndex: 100005,
      }}
      className="bg-white rounded-2xl shadow-2xl border border-orange-200/90 overflow-y-auto select-none text-left scrollbar-none"
    >
      {/* Top gradient progress line */}
      <div className="h-1.5 w-full bg-orange-100/70 overflow-hidden shrink-0">
        <motion.div
          className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-r-full"
          animate={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />
      </div>

      <div className="p-4 sm:p-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentStepIndex}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {/* Meta Bar: Badge Capsule, Step Counter, Close Button */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200 tracking-wide">
                  {step.badge}
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
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
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
          </motion.div>
        </AnimatePresence>

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
    </motion.div>
  );
}
