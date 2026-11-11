import React, { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
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
  const [actualHeight, setActualHeight] = useState(240);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  // Track window resizing dynamically
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Continuously track actual rendered height of tooltip content
  useLayoutEffect(() => {
    if (tooltipRef.current) {
      const h = tooltipRef.current.offsetHeight;
      if (h > 0 && Math.abs(h - actualHeight) > 4) {
        setActualHeight(h);
      }
    }
  });

  // Viewport-Guaranteed Placement Solver
  // Ensures the tooltip ALWAYS remains 100% visible within the viewport bounds.
  // When targetRect is tall or covers most of the screen, the tooltip is placed comfortably
  // inside the viewport (even if overlapping part of the target) so the admin can read the guide properly.
  const placement = useMemo(() => {
    const isCenterModal = !targetRect || step.pointingDirection === 'none';
    const vpWidth = windowSize.width;
    const vpHeight = windowSize.height;
    const tooltipWidth = Math.min(isCenterModal ? 490 : 390, vpWidth - 32);
    const estimatedHeight = Math.max(160, Math.min(actualHeight > 50 ? actualHeight : 240, vpHeight - 32));

    const minX = 16;
    const maxX = Math.max(minX, vpWidth - tooltipWidth - 16);
    const minY = 16;
    const maxY = Math.max(minY, vpHeight - estimatedHeight - 16);

    // Standalone centered modal (e.g. final celebration guide)
    if (isCenterModal) {
      return {
        x: Math.max(minX, Math.round((vpWidth - tooltipWidth) / 2)),
        y: Math.max(minY, Math.round((vpHeight - estimatedHeight) / 2)),
        width: tooltipWidth,
        direction: 'none' as const,
      };
    }

    const margin = 16;

    // Helper: checks whether candidate tooltip box overlaps targetRect
    const collidesWithTarget = (x: number, y: number): boolean => {
      const boxLeft = x;
      const boxRight = x + tooltipWidth;
      const boxTop = y;
      const boxBottom = y + estimatedHeight;

      const safeTargetLeft = targetRect.left - 6;
      const safeTargetRight = targetRect.right + 6;
      const safeTargetTop = targetRect.top - 6;
      const safeTargetBottom = targetRect.bottom + 6;

      const overlapX = boxLeft < safeTargetRight && boxRight > safeTargetLeft;
      const overlapY = boxTop < safeTargetBottom && boxBottom > safeTargetTop;

      return overlapX && overlapY;
    };

    // Candidate generator for each direction
    const getCandidate = (direction: 'top' | 'bottom' | 'left' | 'right') => {
      let rawX = 0;
      let rawY = 0;

      if (direction === 'bottom') {
        rawX = targetRect.left + (targetRect.width - tooltipWidth) / 2;
        rawY = targetRect.bottom + margin;
      } else if (direction === 'top') {
        rawX = targetRect.left + (targetRect.width - tooltipWidth) / 2;
        rawY = targetRect.top - estimatedHeight - margin;
      } else if (direction === 'left') {
        rawX = targetRect.left - tooltipWidth - margin;
        rawY = targetRect.top + (targetRect.height - estimatedHeight) / 2;
      } else if (direction === 'right') {
        rawX = targetRect.right + margin;
        rawY = targetRect.top + (targetRect.height - estimatedHeight) / 2;
      }

      const clampedX = Math.max(minX, Math.min(maxX, rawX));
      const clampedY = Math.max(minY, Math.min(maxY, rawY));

      const fitsStrictly = rawY >= minY && rawY <= maxY && rawX >= minX && rawX <= maxX;

      return { x: clampedX, y: clampedY, rawX, rawY, direction, fitsStrictly };
    };

    // Order candidate directions based on preferred direction
    const pref = step.pointingDirection;
    let dirOrder: ('bottom' | 'top' | 'left' | 'right')[] = ['bottom', 'top', 'right', 'left'];

    if (pref === 'left') {
      dirOrder = ['left', 'right', 'bottom', 'top'];
    } else if (pref === 'right') {
      dirOrder = ['right', 'left', 'bottom', 'top'];
    } else if (pref === 'top') {
      dirOrder = ['top', 'bottom', 'right', 'left'];
    } else if (pref === 'bottom') {
      dirOrder = ['bottom', 'top', 'right', 'left'];
    }

    // 1. Try to find a direction where it fits strictly within viewport AND has ZERO collision with target
    let chosen: { x: number; y: number; direction: 'top' | 'bottom' | 'left' | 'right' } | null = null;
    for (const dir of dirOrder) {
      const cand = getCandidate(dir);
      if (cand.fitsStrictly && !collidesWithTarget(cand.x, cand.y)) {
        chosen = cand;
        break;
      }
    }

    // 2. If raw doesn't fit strictly without clamping, try clamped versions that have ZERO collision
    if (!chosen) {
      for (const dir of dirOrder) {
        const cand = getCandidate(dir);
        if (!collidesWithTarget(cand.x, cand.y)) {
          chosen = cand;
          break;
        }
      }
    }

    // 3. Fallback when targetRect is large or fills viewport:
    // ALWAYS prioritize keeping the tooltip inside the viewport!
    // It is permitted to overlap part of the highlighted element as long as the admin can read the guide properly.
    if (!chosen) {
      const targetCenterY = targetRect.top + targetRect.height / 2;
      let fallbackY: number;
      let fallbackDir: 'top' | 'bottom' = 'bottom';

      if (pref === 'top') {
        if (targetRect.top > estimatedHeight + 30) {
          fallbackY = Math.max(minY, targetRect.top - estimatedHeight - margin);
          fallbackDir = 'top';
        } else {
          fallbackY = maxY;
          fallbackDir = 'top';
        }
      } else if (pref === 'bottom') {
        if (vpHeight - targetRect.bottom > estimatedHeight + 30) {
          fallbackY = Math.min(maxY, targetRect.bottom + margin);
          fallbackDir = 'bottom';
        } else {
          fallbackY = targetCenterY > vpHeight / 2 ? minY : maxY;
          fallbackDir = 'bottom';
        }
      } else {
        fallbackY = targetCenterY > vpHeight / 2 ? minY : maxY;
        fallbackDir = targetCenterY > vpHeight / 2 ? 'bottom' : 'top';
      }

      const fallbackX = Math.max(minX, Math.min(maxX, targetRect.left + (targetRect.width - tooltipWidth) / 2));

      chosen = {
        x: fallbackX,
        y: fallbackY,
        direction: fallbackDir,
      };
    }

    // ABSOLUTE FINAL GUARANTEE: Never, ever let x or y be outside the visible viewport!
    const finalX = Math.max(minX, Math.min(maxX, chosen.x));
    const finalY = Math.max(minY, Math.min(maxY, chosen.y));

    return {
      x: finalX,
      y: finalY,
      width: tooltipWidth,
      direction: chosen.direction,
    };
  }, [targetRect, step.pointingDirection, isFinalStep, actualHeight, windowSize]);

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
      className="bg-white rounded-2xl shadow-2xl border border-orange-200/90 overflow-y-auto max-h-[calc(100vh-32px)] select-none text-left scrollbar-none relative"
    >
      {/* Top gradient progress line */}
      <div className="h-1.5 w-full bg-orange-100/70 overflow-hidden shrink-0 relative z-10">
        <motion.div
          className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-r-full"
          animate={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />
      </div>

      {/* Alumi Mascot on Bottom-Left for Final Celebration Guide (Upper 60% visible, bottom 40% clipped) */}
      {isFinalStep && (
        <motion.div
          initial={{ y: 35, opacity: 0, scale: 0.85 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 280,
            damping: 20,
            delay: 0.12,
          }}
          className="absolute bottom-0 left-0 sm:left-2 pointer-events-none select-none z-0"
        >
          <img
            src="/image/mascot1.png"
            alt="Alumi Mascot"
            className="w-36 sm:w-48 md:w-52 h-auto object-contain translate-y-[40%] drop-shadow-md"
          />
        </motion.div>
      )}

      <div className="p-4 sm:p-5 relative z-10">
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
        <div className={`flex items-center justify-between gap-2 pt-3 sm:pt-3.5 ${isFinalStep ? '' : 'border-t border-gray-100'}`}>
          <div>
            {!isFinalStep ? (
              <button
                type="button"
                onClick={onSkip}
                className="text-xs font-semibold text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer px-2.5 py-1.5 rounded-lg shrink-0"
              >
                Skip Tour
              </button>
            ) : (
              /* Non-interfering spacer on the left above the bottom-left mascot */
              <div className="w-24 sm:w-36 h-4 shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {!isFirstStep && !isFinalStep && (
              <button
                type="button"
                onClick={onPrev}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer shrink-0"
              >
                <ChevronLeftIcon className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
            >
              <span className="truncate max-w-[140px] xs:max-w-[190px] sm:max-w-none">
                {step.actionText || (isFinalStep ? 'Get Started' : 'Next Step')}
              </span>
              {!isFinalStep && <ArrowRightIcon className="w-3.5 h-3.5 shrink-0" />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
