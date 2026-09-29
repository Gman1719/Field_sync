import React from 'react';
import Modal from './Modal';
import Button, { type ButtonVariant } from './Button';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const icons = {
    danger: <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
    info: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
  };

  const iconBgs = {
    danger: 'bg-rose-50 border border-rose-200/80 dark:bg-rose-950/40 dark:border-rose-800/50',
    warning: 'bg-amber-50 border border-amber-200/80 dark:bg-amber-950/40 dark:border-amber-800/50',
    info: 'bg-blue-50 border border-blue-200/80 dark:bg-blue-950/40 dark:border-blue-800/50',
    success: 'bg-emerald-50 border border-emerald-200/80 dark:bg-emerald-950/40 dark:border-emerald-800/50',
  };

  const buttonVariant: ButtonVariant = variant === 'warning' ? 'primary' : (variant as ButtonVariant);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button variant={buttonVariant} onClick={onConfirm} isLoading={isLoading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4 py-1">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${iconBgs[variant] || 'bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
          {icons[variant] || icons.danger}
        </div>
        <div className="min-w-0 pt-0.5">
          <h4 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{title}</h4>
          {message && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">{message}</p>}
        </div>
      </div>
    </Modal>
  );
}
