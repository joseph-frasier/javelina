'use client';

import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const spacing = 8; // Space between trigger and tooltip
      
      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = triggerRect.top - tooltipRect.height - spacing;
          left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'bottom':
          top = triggerRect.bottom + spacing;
          left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'left':
          top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
          left = triggerRect.left - tooltipRect.width - spacing;
          break;
        case 'right':
          top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
          left = triggerRect.right + spacing;
          break;
      }

      setTooltipStyle({ top: `${top}px`, left: `${left}px` });
    }
  }, [isVisible, position]);

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-1',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-1',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-1',
  };

  return (
    <>
      <span className="relative inline-flex" ref={triggerRef}>
        <span
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
          className="cursor-help inline-flex"
        >
          {children}
        </span>
      </span>

      {isVisible && (
        <span
          ref={tooltipRef}
          style={tooltipStyle}
          className="fixed z-[99999] px-3 py-2 text-sm text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-100"
        >
          {content}
          {/* Arrow */}
          <span
            className={`absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45 ${arrowClasses[position]}`}
          />
        </span>
      )}
    </>
  );
}

// Info icon component to use with Tooltip
export function InfoIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors ${className}`}
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

