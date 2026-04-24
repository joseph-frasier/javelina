'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({
    visibility: 'hidden',
  });
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const updatePosition = () => {
        if (triggerRef.current && tooltipRef.current) {
          const triggerRect = triggerRef.current.getBoundingClientRect();
          const tooltipRect = tooltipRef.current.getBoundingClientRect();
          const spacing = 8;

          let top = 0;
          let left = 0;

          switch (position) {
            case 'top':
              top = triggerRect.top - tooltipRect.height - spacing;
              left =
                triggerRect.left +
                triggerRect.width / 2 -
                tooltipRect.width / 2;
              break;
            case 'bottom':
              top = triggerRect.bottom + spacing;
              left =
                triggerRect.left +
                triggerRect.width / 2 -
                tooltipRect.width / 2;
              break;
            case 'left':
              top =
                triggerRect.top +
                triggerRect.height / 2 -
                tooltipRect.height / 2;
              left = triggerRect.left - tooltipRect.width - spacing;
              break;
            case 'right':
              top =
                triggerRect.top +
                triggerRect.height / 2 -
                tooltipRect.height / 2;
              left = triggerRect.right + spacing;
              break;
          }

          setTooltipStyle({
            top: `${top}px`,
            left: `${left}px`,
            visibility: 'visible',
            opacity: 1,
          });
        }
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(updatePosition);
      });
    }
  }, [isVisible, position]);

  const arrowClasses: Record<NonNullable<TooltipProps['position']>, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-1',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-1',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-1',
  };

  const tooltipElement =
    isVisible && mounted ? (
      <div
        ref={tooltipRef}
        style={tooltipStyle}
        className="fixed z-[99999] px-2.5 py-1.5 text-xs font-medium text-white bg-[#0f1419] dark:bg-[#232a32] rounded-md shadow-popover whitespace-nowrap pointer-events-none transition-opacity duration-100"
      >
        {content}
        <span
          className={clsx(
            'absolute w-2 h-2 bg-[#0f1419] dark:bg-[#232a32] rotate-45',
            arrowClasses[position]
          )}
        />
      </div>
    ) : null;

  return (
    <>
      <span className="relative inline-flex" ref={triggerRef}>
        <span
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
          className="inline-flex"
        >
          {children}
        </span>
      </span>

      {mounted && tooltipElement && createPortal(tooltipElement, document.body)}
    </>
  );
}

export function InfoIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={clsx(
        'w-4 h-4 text-text-muted hover:text-text transition-colors',
        className
      )}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
