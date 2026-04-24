'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { clsx } from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  eyebrow?: string;
  headerContent?: React.ReactNode;
  footer?: React.ReactNode;
  bodyClassName?: string;
  contentClassName?: string;
  allowOverflow?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'medium',
  eyebrow,
  headerContent,
  footer,
  bodyClassName,
  contentClassName,
  allowOverflow = false,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!shouldRender || !mounted) return null;

  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-2xl',
    xlarge: 'max-w-5xl',
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-[rgba(11,13,16,0.55)] backdrop-blur-[2px] pointer-events-auto"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-hidden="true"
      />

      <div
        className="flex min-h-full items-center justify-center p-4 relative pointer-events-none"
        style={{ zIndex: 100000 }}
      >
        <div
          ref={modalRef}
          className={clsx(
            'relative w-full pointer-events-auto rounded-2xl bg-surface border border-border shadow-popover',
            sizeClasses[size],
            allowOverflow ? 'overflow-visible' : 'overflow-hidden',
            contentClassName
          )}
          onClick={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
          }}
        >
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {eyebrow && (
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
                    {eyebrow}
                  </p>
                )}
                <h3
                  id="modal-title"
                  className="text-lg font-semibold tracking-tight text-text leading-tight"
                >
                  {title}
                </h3>
                {subtitle && (
                  <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-text-muted">
                    {subtitle}
                  </p>
                )}
                {headerContent && <div className="mt-3">{headerContent}</div>}
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-text-muted transition-colors hover:bg-surface-hover hover:text-text focus-visible:outline-none focus-visible:shadow-focus-ring"
                aria-label="Close modal"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className={clsx('px-6 py-5', bodyClassName)}>{children}</div>

          {footer && (
            <div className="border-t border-border px-6 py-4 bg-surface-alt rounded-b-2xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
