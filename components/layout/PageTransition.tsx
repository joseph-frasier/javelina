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
          x: 12,
        },
        {
          opacity: 1,
          x: 0,
          duration: 0.25,
          ease: 'power2.out',
          onComplete: () => {
            setIsInitialMount(false);
          }
        }
      );
    }
  }, [isInitialMount]);

  // Animate on route change: fade the incoming content in only.
  //
  // There is deliberately no fade-OUT leg. Animating the outgoing page to
  // opacity 0 blanks the screen for the duration of that tween before the new
  // page starts appearing, which the user feels as latency on every single
  // navigation regardless of how fast the data actually loads.
  useEffect(() => {
    if (!isInitialMount && contentRef.current) {
      // Scroll to top immediately
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }

      gsap.fromTo(
        contentRef.current,
        {
          opacity: 0,
          x: 12,
        },
        {
          opacity: 1,
          x: 0,
          duration: 0.18,
          ease: 'power2.out',
        }
      );
    }
  }, [pathname, isInitialMount]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto bg-surface-alt">
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
}

