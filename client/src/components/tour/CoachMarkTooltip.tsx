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

  // Determine smart coordinates in the viewport
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect || step.pointingDirection === 'none') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '480px',
        width: 'calc(100vw - 32px)',
        zIndex: 100000,
      };
    }

    const margin = 16;
    const tooltipWidth = Math.min(420, window.innerWidth - 32);
    const estimatedHeight = 270;

    let left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, left));

    let top = targetRect.bottom + margin;

    // If placed below and overflows bottom of screen, flip to top
    if (top + estimatedHeight > window.innerHeight - 20) {
      if (targetRect.top - estimatedHeight - margin > 20) {
        top = targetRect.top - estimatedHeight - margin;
      } else {
        top = Math.max(20, window.innerHeight - estimatedHeight - 20);
      }
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      zIndex: 100000,
      transition: 'top 0.22s ease-out, left 0.22s ease-out',
    };
  };

  return (
    <div
      style={getTooltipStyle()}
      className="bg-white rounded-2xl shadow-2xl border border-orange-200/90 overflow-hidden select-none text-left animate-in zoom-in-95 fade-in duration-200"
    >
      {/* Top gradient progress line */}
      <div className="h-1.5 w-full bg-orange-100/70 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300 rounded-r-full"
          style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
        />
      </div>

      <div className="p-4 sm:p-5">
        {/* Meta Bar: Badge, Step Counter, Close Button */}
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
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Close walkthrough"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Step Title */}
        <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug mb-1.5 flex items-center gap-1.5">
          {step.title}
        </h3>

        {/* Step Content */}
        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4">
          {step.content}
        </p>

        {/* Floating Coach Mark Hint */}
        {targetRect && step.pointingDirection !== 'none' && (
          <div className="flex items-center gap-2 mb-3 px-2.5 py-1.5 bg-orange-50 border border-orange-100 rounded-lg text-[11px] text-orange-800 font-medium">
            <span className="animate-bounce inline-block text-sm">
              {step.pointingDirection === 'top' ? '👆' : step.pointingDirection === 'left' ? '👈' : '👇'}
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
