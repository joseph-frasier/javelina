'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import gsap from 'gsap';
import { Card } from '@/components/ui/Card';

interface CollapsibleCardProps {
  title: ReactNode;
  children: ReactNode;
  storageKey: string;
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

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      setIsExpanded(saved === 'true');
    }
    setIsInitialized(true);
  }, [storageKey]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(storageKey, String(isExpanded));
    }
  }, [isExpanded, storageKey, isInitialized]);

  useEffect(() => {
    if (!isInitialized || !contentRef.current || !chevronRef.current) return;

    if (isExpanded) {
      gsap.to(contentRef.current, {
        height: 'auto',
        opacity: 1,
        duration: 0.25,
        ease: 'power2.out',
      });
      gsap.to(chevronRef.current, {
        rotation: 0,
        duration: 0.25,
        ease: 'power2.out',
      });
    } else {
      gsap.to(contentRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in',
      });
      gsap.to(chevronRef.current, {
        rotation: -90,
        duration: 0.2,
        ease: 'power2.in',
      });
    }
  }, [isExpanded, isInitialized]);

  useEffect(() => {
    if (!isInitialized || !contentRef.current || !chevronRef.current) return;

    gsap.set(contentRef.current, {
      height: isExpanded ? 'auto' : 0,
      opacity: isExpanded ? 1 : 0,
    });
    gsap.set(chevronRef.current, {
      rotation: isExpanded ? 0 : -90,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

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
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-muted transition-colors hover:bg-surface-hover hover:text-text focus-visible:outline-none focus-visible:shadow-focus-ring"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg
            ref={chevronRef}
            className="w-4 h-4"
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
        style={{
          height: isInitialized ? undefined : defaultExpanded ? 'auto' : 0,
        }}
      >
        {children}
      </div>
    </Card>
  );
}
