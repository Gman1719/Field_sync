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
    danger: <AlertTriangle className="w-6 h-6 text-red-600" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-600" />,
    info: <Info className="w-6 h-6 text-blue-600" />,
    success: <CheckCircle2 className="w-6 h-6 text-green-600" />,
  };

  const iconBgs = {
    danger: 'bg-red-50 dark:bg-red-950/50',
    warning: 'bg-amber-50 dark:bg-amber-950/50',
    info: 'bg-blue-50 dark:bg-blue-950/50',
    success: 'bg-green-50 dark:bg-green-950/50',
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
      <div className="flex items-start gap-4">
        <div className={`p-2.5 rounded-full flex-shrink-0 ${iconBgs[variant] || 'bg-slate-100 dark:bg-slate-800'}`}>
          {icons[variant] || icons.danger}
        </div>
        <div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-[#F8FAFC]">{title}</h4>
          {message && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{message}</p>}
        </div>
      </div>
    </Modal>
  );
}
