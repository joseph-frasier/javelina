'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
}

export function Modal({ isOpen, onClose, title, children, size = 'medium' }: ModalProps) {
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
    } else if (!isOpen && modalRef.current && overlayRef.current) {
      // Closing animation
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in'
      });

      gsap.to(modalRef.current, {
        scale: 0.95,
        opacity: 0,
        y: 20,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => setShouldRender(false)
      });
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
    large: 'max-w-2xl'
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 9999 }}
    >
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        aria-hidden="true"
        style={{ zIndex: 9999 }}
      />

      {/* Modal content */}
      <div className="flex min-h-full items-center justify-center p-4 relative" style={{ zIndex: 10000 }}>
        <div
          ref={modalRef}
          className={`relative w-full ${sizeClasses[size]} bg-white dark:bg-orange-dark rounded-lg shadow-xl`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-light">
            <h3
              id="modal-title"
              className="text-xl font-semibold text-orange-dark dark:text-white"
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-slate hover:text-orange-dark dark:hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <svg
                className="w-6 h-6"
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

          {/* Body */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  // Render modal at document.body level using portal
  return createPortal(modalContent, document.body);
}

