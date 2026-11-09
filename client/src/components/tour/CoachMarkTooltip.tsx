import React from 'react';
import { XMarkIcon, ChevronLeftIcon, ArrowRightIcon, SparklesIcon } from '@heroicons/react/24/outline';
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

  // Compute smart tooltip coordinates relative to viewport
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect || step.pointingDirection === 'none') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '460px',
        width: 'calc(100vw - 32px)',
        zIndex: 9995,
      };
    }

    const margin = 14;
    const tooltipWidth = Math.min(420, window.innerWidth - 32);
    const estimatedHeight = 260;

    let top = 0;
    let left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;

    // Constrain horizontal within viewport
    left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, left));

    if (step.pointingDirection === 'bottom' || targetRect.top - estimatedHeight - margin < 20) {
      // Place below target
      top = targetRect.bottom + margin;
      if (top + estimatedHeight > window.innerHeight - 20) {
        top = Math.max(20, window.innerHeight - estimatedHeight - 20);
      }
    } else {
      // Place above target
      top = Math.max(20, targetRect.top - estimatedHeight - margin);
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      zIndex: 9995,
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  };

  return (
    <div
      style={getTooltipStyle()}
      className="bg-white rounded-2xl shadow-2xl border border-orange-200/90 overflow-hidden animate-in zoom-in-95 fade-in duration-200 select-none text-left"
    >
      {/* Top subtle orange progress bar */}
      <div className="h-1.5 w-full bg-orange-100/70 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300 rounded-r-full"
          style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
        />
      </div>

      <div className="p-4 sm:p-5">
        {/* Header meta bar */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200 flex items-center gap-1">
              <SparklesIcon className="w-3 h-3 text-orange-600" />
              {step.badge}
            </span>
            <span className="text-[11px] font-semibold text-gray-400">
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
          </div>

          <button
            type="button"
            onClick={onSkip}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Skip Walkthrough"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Step Title */}
        <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug mb-1.5 flex items-center gap-1.5">
          {step.title}
        </h3>

        {/* Step Description */}
        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4">
          {step.content}
        </p>

        {/* Pointer indicator hint */}
        {targetRect && step.pointingDirection !== 'none' && (
          <div className="flex items-center gap-2 mb-3 px-2.5 py-1.5 bg-orange-50/70 border border-orange-100 rounded-lg text-[11px] text-orange-800 font-medium">
            <span className="animate-bounce inline-block text-sm">
              {step.pointingDirection === 'top' ? '👆' : step.pointingDirection === 'left' ? '👈' : '👇'}
            </span>
            <span>Highlighted on your screen</span>
          </div>
        )}

        {/* Step dots indicator */}
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

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <div>
            {!isFinalStep ? (
              <button
                type="button"
                onClick={onSkip}
                className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors cursor-pointer px-1 py-1"
              >
                Skip Tour
              </button>
            ) : null}
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

