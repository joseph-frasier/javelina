'use client';

import { useRef, useEffect } from 'react';
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
  
  // Animate on initial mount
  useGSAP(() => {
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        {
          opacity: 0,
          scale: 0.98,
        },
        {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: 'power2.out',
        }
      );
    }
  }, []);

  // Animate on route change
  useEffect(() => {
    if (contentRef.current) {
      // Fade out and scale down
      gsap.to(contentRef.current, {
        opacity: 0,
        scale: 0.98,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => {
          // Scroll to top
          if (containerRef.current) {
            containerRef.current.scrollTop = 0;
          }
          
          // Fade in and scale up
          gsap.fromTo(
            contentRef.current,
            {
              opacity: 0,
              scale: 0.98,
            },
            {
              opacity: 1,
              scale: 1,
              duration: 0.5,
              ease: 'power2.out',
            }
          );
        },
      });
    }
  }, [pathname]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto bg-gray-light dark:bg-orange-dark">
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
}

