import React from 'react';
import {
  WifiIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ShieldExclamationIcon,
  DocumentMagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { mapErrorToUserFriendly } from '@/utils/errorMapper';

interface ErrorStateProps {
  error?: unknown;
  title?: string;
  message?: string;
  onRetry?: () => void;
  actionText?: string;
  compact?: boolean;
  className?: string;
}

export default function ErrorState({
  error,
  title,
  message,
  onRetry,
  actionText,
  compact = false,
  className = '',
}: ErrorStateProps) {
  const mapped = error ? mapErrorToUserFriendly(error) : null;
  const displayTitle = title || mapped?.title || 'Unable to Load Content';
  const displayMessage = message || mapped?.message || 'Something went wrong while retrieving information. Please try again.';
  const retryLabel = actionText || mapped?.actionText || 'Try Again';
  const category = mapped?.category || 'unknown';

  const renderIcon = () => {
    switch (category) {
      case 'network':
        return <WifiIcon className={compact ? 'w-6 h-6 text-amber-600' : 'w-8 h-8 text-amber-600'} />;
      case 'auth':
      case 'permission':
        return <ShieldExclamationIcon className={compact ? 'w-6 h-6 text-red-600' : 'w-8 h-8 text-red-600'} />;
      case 'notFound':
        return <DocumentMagnifyingGlassIcon className={compact ? 'w-6 h-6 text-gray-500' : 'w-8 h-8 text-gray-500'} />;
      default:
        return <ExclamationTriangleIcon className={compact ? 'w-6 h-6 text-orange-600' : 'w-8 h-8 text-orange-600'} />;
    }
  };

  const iconBg = category === 'network'
    ? 'bg-amber-50 border-amber-200'
    : category === 'auth' || category === 'permission'
    ? 'bg-red-50 border-red-200'
    : 'bg-orange-50 border-orange-200';

  if (compact) {
    return (
      <div className={`p-4 rounded-xl border bg-white text-center flex flex-col items-center justify-center gap-2 ${iconBg} ${className}`}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-2xs border">
          {renderIcon()}
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-900">{displayTitle}</h4>
          <p className="text-[11px] text-gray-600 max-w-xs mx-auto mt-0.5">{displayMessage}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white hover:bg-orange-600 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowPathIcon className="w-3.5 h-3.5" />
            <span>{retryLabel}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl p-8 sm:p-12 text-center max-w-md mx-auto my-6 shadow-xs ${className}`}>
      <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto mb-4 ${iconBg} shadow-2xs`}>
        {renderIcon()}
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-1.5">{displayTitle}</h3>
      <p className="text-xs text-gray-600 leading-relaxed mb-6 max-w-sm mx-auto">
        {displayMessage}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <ArrowPathIcon className="w-4 h-4" />
          <span>{retryLabel}</span>
        </button>
      )}
    </div>
  );
}

