'use client';

import React from 'react';
import Button from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const variantClasses = {
    danger: 'text-red-600',
    warning: 'text-orange-600',
    info: 'text-orange-600',
  };

  const iconByVariant = {
    danger: (
      <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    warning: (
      <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          {/* Icon & Title */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {iconByVariant[variant]}
            </div>
            <div className="flex-1">
              <h3 className={`text-lg font-semibold ${variantClasses[variant]}`}>
                {title}
              </h3>
              <p className="mt-2 text-sm text-gray-slate dark:text-gray-300">
                {message}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              variant="primary"
              onClick={onConfirm}
              disabled={isLoading}
              className={variant === 'danger' ? '!bg-red-600 hover:!bg-red-700' : ''}
            >
              {isLoading ? 'Processing...' : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

