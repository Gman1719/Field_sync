import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false
}) {
  const icons = {
    danger: <AlertTriangle className="w-6 h-6 text-red-600" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-600" />,
    info: <Info className="w-6 h-6 text-blue-600" />,
    success: <CheckCircle2 className="w-6 h-6 text-green-600" />
  };

  const iconBgs = {
    danger: 'bg-red-50',
    warning: 'bg-amber-50',
    info: 'bg-blue-50',
    success: 'bg-green-50'
  };

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
          <Button
            variant={variant === 'warning' ? 'primary' : variant}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className={`p-2.5 rounded-full flex-shrink-0 ${iconBgs[variant] || 'bg-slate-100'}`}>
          {icons[variant] || icons.danger}
        </div>
        <div>
          <h4 className="text-base font-semibold text-slate-900">{title}</h4>
          <p className="text-sm text-slate-500 mt-1">{message}</p>
        </div>
      </div>
    </Modal>
  );
}
