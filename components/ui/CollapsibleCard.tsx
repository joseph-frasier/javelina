'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import gsap from 'gsap';
import { Card } from '@/components/ui/Card';

interface CollapsibleCardProps {
  title: string;
  children: ReactNode;
  storageKey: string; // Unique key for localStorage persistence (e.g., "zone-{zoneId}-changeHistory")
  className?: string;
  defaultExpanded?: boolean;
}

export function CollapsibleCard({
  title,
  children,
  storageKey,
  className = '',
  defaultExpanded = true,
}: CollapsibleCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isInitialized, setIsInitialized] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<SVGSVGElement>(null);

  // Load saved preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      setIsExpanded(saved === 'true');
    }
    setIsInitialized(true);
  }, [storageKey]);

  // Save preference to localStorage when it changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(storageKey, String(isExpanded));
    }
  }, [isExpanded, storageKey, isInitialized]);

  // Animate expand/collapse
  useEffect(() => {
    if (!isInitialized || !contentRef.current || !chevronRef.current) return;

    if (isExpanded) {
      // Expand animation
      gsap.to(contentRef.current, {
        height: 'auto',
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
      gsap.to(chevronRef.current, {
        rotation: 0,
        duration: 0.3,
        ease: 'power2.out',
      });
    } else {
      // Collapse animation
      gsap.to(contentRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
      });
      gsap.to(chevronRef.current, {
        rotation: -90,
        duration: 0.3,
        ease: 'power2.in',
      });
    }
  }, [isExpanded, isInitialized]);

  // Set initial state without animation
  useEffect(() => {
    if (!isInitialized || !contentRef.current || !chevronRef.current) return;

    // Set initial state immediately without animation
    gsap.set(contentRef.current, {
      height: isExpanded ? 'auto' : 0,
      opacity: isExpanded ? 1 : 0,
    });
    gsap.set(chevronRef.current, {
      rotation: isExpanded ? 0 : -90,
    });
  }, [isInitialized]); // Only run once when initialized

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Card
      title={title}
      className={className}
      action={
        <button
          onClick={toggleExpanded}
          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg
            ref={chevronRef}
            className="w-4 h-4 text-gray-500 dark:text-gray-400"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M7 10l5 5 5-5H7z" />
          </svg>
        </button>
      }
    >
      <div
        ref={contentRef}
        className="overflow-hidden"
        style={{ height: isInitialized ? undefined : (defaultExpanded ? 'auto' : 0) }}
      >
        {children}
      </div>
    </Card>
  );
}

