'use client';

import { useRef, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isInitialMount, setIsInitialMount] = useState(true);
  
  // Animate on initial mount
  useGSAP(() => {
    if (contentRef.current && isInitialMount) {
      gsap.fromTo(
        contentRef.current,
        {
          opacity: 0,
          x: 30,
        },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: 'power2.out',
          onComplete: () => {
            setIsInitialMount(false);
          }
        }
      );
    }
  }, [isInitialMount]);

  // Animate on route change
  useEffect(() => {
    if (!isInitialMount && contentRef.current) {
      // Scroll to top immediately
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      
      // Slide out to left + fade out, then slide in from right + fade in
      const timeline = gsap.timeline();
      
      timeline
        .to(contentRef.current, {
          opacity: 0,
          x: -30,
          duration: 0.3,
          ease: 'power2.in',
        })
        .fromTo(
          contentRef.current,
          {
            opacity: 0,
            x: 30,
          },
          {
            opacity: 1,
            x: 0,
            duration: 0.5,
            ease: 'power2.out',
          }
        );
    }
  }, [pathname, isInitialMount]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto bg-gray-light dark:bg-orange-dark">
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
}

