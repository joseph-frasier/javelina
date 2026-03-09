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

  // Ensure we're on the client side
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle opening/closing with animation
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    }
  }, [isOpen]);

  // GSAP Animation
  useGSAP(() => {
    if (!mounted || !shouldRender) return;

    if (isOpen && modalRef.current && overlayRef.current) {
      // Opening animation - Scale + Fade
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );

      gsap.fromTo(
        modalRef.current,
        { 
          scale: 0.95, 
          opacity: 0,
          y: 20
        },
        { 
          scale: 1, 
          opacity: 1,
          y: 0,
          duration: 0.4, 
          ease: 'power3.out'
        }
      );
    }
  }, [isOpen, mounted, shouldRender]);

  // Handle closing animation separately
  useEffect(() => {
    if (!mounted || !shouldRender) return;
    if (isOpen) return; // Only handle closing

    if (modalRef.current && overlayRef.current) {
      // Kill any existing animations
      gsap.killTweensOf([modalRef.current, overlayRef.current]);

      // Closing animation
      const tl = gsap.timeline({
        onComplete: () => setShouldRender(false)
      });

      tl.to(overlayRef.current, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in'
      });

      tl.to(modalRef.current, {
        scale: 0.95,
        opacity: 0,
        y: 20,
        duration: 0.2,
        ease: 'power2.in'
      }, 0); // Start at same time as overlay
    }
  }, [isOpen, mounted, shouldRender]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
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
    xlarge: 'max-w-5xl'
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 99999 }}
    >
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(0,176,255,0.08),transparent_28%),radial-gradient(circle_at_bottom,rgba(239,114,21,0.1),transparent_30%),rgba(6,10,15,0.52)] pointer-events-auto"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-hidden="true"
        style={{ zIndex: 99999, pointerEvents: 'auto' }}
      />

      {/* Modal content */}
      <div 
        className="flex min-h-full items-center justify-center p-4 relative pointer-events-none" 
        style={{ zIndex: 100000 }}
      >
        <div
          ref={modalRef}
          className={clsx(
            `relative w-full ${sizeClasses[size]} pointer-events-auto rounded-[24px] border border-white/10 bg-[#0b0f14] text-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]`,
            allowOverflow ? 'overflow-visible' : 'overflow-hidden',
            contentClassName
          )}
          onClick={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
          }}
        >
          <div className="pointer-events-none absolute inset-0 rounded-[24px] bg-[radial-gradient(circle_at_top_left,rgba(239,114,21,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(0,176,255,0.12),transparent_32%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-[24px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          {/* Header */}
          <div className="relative border-b border-white/10 px-6 py-5 md:px-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {eyebrow && (
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.28em] text-blue-electric/90">
                    {eyebrow}
                  </p>
                )}
                <h3
                  id="modal-title"
                  className="text-xl font-semibold tracking-tight text-[#fff3ea] md:text-[1.7rem]"
                >
                  {title}
                </h3>
                {subtitle && (
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                    {subtitle}
                  </p>
                )}
                {headerContent && <div className="mt-4">{headerContent}</div>}
              </div>
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                aria-label="Close modal"
              >
                <svg
                  className="h-5 w-5"
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

          {/* Body */}
          <div className={clsx('relative px-6 py-6 md:px-7', bodyClassName)}>
            {children}
          </div>

          {footer && (
            <div className="relative border-t border-white/10 px-6 py-4 md:px-7">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render modal at document.body level using portal
  return createPortal(modalContent, document.body);
}
