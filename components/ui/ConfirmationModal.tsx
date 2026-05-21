'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { clsx } from 'clsx';
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

const variantStyles: Record<
  NonNullable<ConfirmationModalProps['variant']>,
  { title: string; iconWrap: string; buttonVariant: 'primary' | 'danger' }
> = {
  danger: {
    title: 'text-danger',
    iconWrap: 'bg-danger-soft text-danger',
    buttonVariant: 'danger',
  },
  warning: {
    title: 'text-warning',
    iconWrap: 'bg-warning-soft text-warning',
    buttonVariant: 'primary',
  },
  info: {
    title: 'text-accent',
    iconWrap: 'bg-accent-soft text-accent',
    buttonVariant: 'primary',
  },
};

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
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    }
  }, [isOpen]);

  useGSAP(() => {
    if (!mounted || !shouldRender) return;

    if (isOpen && modalRef.current && overlayRef.current) {
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.22, ease: 'power2.out' }
      );

      gsap.fromTo(
        modalRef.current,
        { scale: 0.97, opacity: 0, y: 16 },
        { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' }
      );
    }
  }, [isOpen, mounted, shouldRender]);

  useEffect(() => {
    if (!mounted || !shouldRender) return;
    if (isOpen) return;

    if (modalRef.current && overlayRef.current) {
      gsap.killTweensOf([modalRef.current, overlayRef.current]);

      const tl = gsap.timeline({
        onComplete: () => setShouldRender(false),
      });

      tl.to(overlayRef.current, {
        opacity: 0,
        duration: 0.18,
        ease: 'power2.in',
      });

      tl.to(
        modalRef.current,
        {
          scale: 0.97,
          opacity: 0,
          y: 16,
          duration: 0.18,
          ease: 'power2.in',
        },
        0
      );
    }
  }, [isOpen, mounted, shouldRender]);

  if (!shouldRender || !mounted) return null;

  const styles = variantStyles[variant];

  const iconSvg = (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      {variant === 'info' ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      )}
    </svg>
  );

  const modalContent = (
    <div className="fixed inset-0 z-[100001] flex items-center justify-center">
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-[rgba(11,13,16,0.55)] backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={modalRef}
        className="relative bg-surface rounded-2xl border border-border shadow-popover max-w-md w-full mx-4"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={clsx(
                'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                styles.iconWrap
              )}
            >
              {iconSvg}
            </div>
            <div className="flex-1 min-w-0">
              <h3
                id="confirmation-title"
                className={clsx(
                  'text-lg font-semibold leading-tight',
                  styles.title
                )}
              >
                {title}
              </h3>
              <p className="mt-2 text-sm text-text-muted leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3 justify-end">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              {cancelText}
            </Button>
            <Button
              variant={styles.buttonVariant}
              onClick={onConfirm}
              loading={isLoading}
            >
              {isLoading ? 'Processing...' : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
