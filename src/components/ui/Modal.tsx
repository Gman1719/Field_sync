import React, { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  maxWidth?: string;
  className?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  maxWidth,
  className = '',
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes: Record<ModalSize, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw]',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      {/* Modern Glassmorphic Backdrop Scrim */}
      <div
        className="fixed inset-0 bg-slate-950/65 dark:bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Positioning Wrapper */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
        <div
          className={`relative transform overflow-hidden rounded-2xl sm:rounded-3xl bg-white text-left shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18),0_0_1px_1px_rgba(15,23,42,0.06)] border border-slate-200/90 dark:bg-gradient-to-b dark:from-[#1C1410] dark:to-[#140E0B] dark:border-[#38261E] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)] transition-all sm:my-8 w-full ${
            maxWidth || sizes[size] || sizes.md
          } ${className} animate-in zoom-in-95 fade-in duration-200 ease-out`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || description) && (
            <div className="px-6 py-5 border-b border-slate-100 dark:border-[#2C1D16] flex items-center justify-between gap-4">
              <div className="min-w-0 pr-2">
                {title && (
                  <h3
                    id="modal-title"
                    className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug"
                  >
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-[#BFA89B] mt-1 leading-normal">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-[#A8988B] dark:hover:text-white bg-slate-100/70 hover:bg-slate-200/80 dark:bg-[#251A14] dark:hover:bg-[#34241C] border border-transparent dark:border-[#38261E] transition-all duration-150 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Dismiss button when no title or description is provided */}
          {!title && !description && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-[#A8988B] dark:hover:text-white bg-slate-100/70 hover:bg-slate-200/80 dark:bg-[#251A14] dark:hover:bg-[#34241C] border border-transparent dark:border-[#38261E] transition-all duration-150"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Modal Content Well */}
          <div className="px-6 py-5 sm:p-6 max-h-[75vh] overflow-y-auto text-slate-700 dark:text-[#E8DDD7]">
            {children}
          </div>

          {/* Docked Modern Footer */}
          {footer && (
            <div className="px-6 py-4 bg-slate-50/90 dark:bg-[#120C0A]/95 backdrop-blur-sm border-t border-slate-100 dark:border-[#2C1D16] flex items-center justify-end gap-3 rounded-b-2xl sm:rounded-b-3xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
