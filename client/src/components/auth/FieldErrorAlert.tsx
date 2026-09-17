import { ReactNode } from 'react';

export interface FieldErrorAlertProps {
  message?: ReactNode;
  className?: string;
}

export default function FieldErrorAlert({ message, className = '' }: FieldErrorAlertProps) {
  if (!message) return null;

  return (
    <div className={`flex items-start gap-1.5 text-xs text-red-600 mt-2 leading-snug animate-in fade-in duration-150 ${className}`}>
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold shrink-0 mt-0.5">
        !
      </span>
      <span className="flex-1">{message}</span>
    </div>
  );
}
