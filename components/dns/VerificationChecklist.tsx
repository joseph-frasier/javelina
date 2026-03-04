'use client';

import { useEffect, useId, useRef, useState } from 'react';
import gsap from 'gsap';

interface VerificationChecklistProps {
  nameservers: string[];
  storageKey: string;
  defaultMinimized?: boolean;
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function VerificationChecklist({
  nameservers,
  storageKey,
  defaultMinimized = false,
}: VerificationChecklistProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [isInitialized, setIsInitialized] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);
  const hasHydratedStateRef = useRef(false);
  const detailsId = useId();

  useEffect(() => {
    hasHydratedStateRef.current = false;
    let persistedMinimized = defaultMinimized;

    try {
      const savedValue = localStorage.getItem(storageKey);
      if (savedValue !== null) {
        persistedMinimized = savedValue === 'true';
      }
    } catch {
      // localStorage unavailable - use defaults
    }

    setIsMinimized(persistedMinimized);
    setIsInitialized(true);

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setPrefersReducedMotion(false);
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updateMotionPreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateMotionPreference);
      return () => mediaQuery.removeEventListener('change', updateMotionPreference);
    }

    mediaQuery.addListener(updateMotionPreference);
    return () => mediaQuery.removeListener(updateMotionPreference);
  }, [storageKey, defaultMinimized]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    try {
      localStorage.setItem(storageKey, String(isMinimized));
    } catch {
      // localStorage unavailable - ignore persistence failures
    }
  }, [isInitialized, isMinimized, storageKey]);

  useEffect(() => {
    const detailsEl = detailsRef.current;
    if (!detailsEl || !isInitialized) {
      return;
    }

    gsap.killTweensOf(detailsEl);

    if (!hasHydratedStateRef.current) {
      gsap.set(detailsEl, {
        height: isMinimized ? 0 : 'auto',
        opacity: isMinimized ? 0 : 1,
        y: isMinimized ? -6 : 0,
      });
      hasHydratedStateRef.current = true;
      return;
    }

    if (prefersReducedMotion) {
      gsap.set(detailsEl, {
        height: isMinimized ? 0 : 'auto',
        opacity: isMinimized ? 0 : 1,
        y: isMinimized ? -6 : 0,
      });
      return;
    }

    if (isMinimized) {
      gsap.to(detailsEl, {
        height: 0,
        opacity: 0,
        y: -6,
        duration: 0.24,
        ease: 'power2.inOut',
      });
      return;
    }

    gsap.set(detailsEl, { height: 'auto' });
    const expandedHeight = detailsEl.offsetHeight;

    gsap.fromTo(
      detailsEl,
      { height: 0, opacity: 0, y: -6 },
      {
        height: expandedHeight,
        opacity: 1,
        y: 0,
        duration: 0.28,
        ease: 'power2.out',
        onComplete: () => {
          gsap.set(detailsEl, { height: 'auto' });
        },
      }
    );

    return () => {
      gsap.killTweensOf(detailsEl);
    };
  }, [isInitialized, isMinimized, prefersReducedMotion]);

  const handleCopy = async (ns: string, index: number) => {
    try {
      await navigator.clipboard.writeText(ns);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // fallback ignored
    }
  };

  return (
    <div className="w-full max-w-full px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
      <div className="flex items-start gap-2">
        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>

        <div className="flex-1 min-w-0 text-sm text-blue-800 dark:text-blue-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">Next Step: Configure Nameservers</p>
            <button
              type="button"
              onClick={() => setIsMinimized((prev) => !prev)}
              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              aria-expanded={!isMinimized}
              aria-controls={detailsId}
            >
              {isMinimized ? 'Expand' : 'Minimize'}
            </button>
          </div>

          <div
            id={detailsId}
            ref={detailsRef}
            className="overflow-hidden"
            aria-hidden={isMinimized}
          >
            <div className="pt-1">
              <p className="mb-1">To move your live DNS service to Javelina, you must update your domain&apos;s nameservers at your registrar.</p>
              <p>Log in to your domain registrar (e.g., GoDaddy, Namecheap) and replace your current nameservers with Javelina&apos;s Nameservers below:</p>

              <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-slate dark:text-gray-400 mb-2">Nameservers for Javelina</h5>
                <div className="flex flex-wrap gap-2">
                  {nameservers.map((ns, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-2 w-fit p-2 rounded-md bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                    >
                      <span className="text-sm font-mono text-gray-800 dark:text-gray-200">{ns}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(ns, index)}
                        className="p-1 rounded text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                        aria-label={`Copy ${ns}`}
                      >
                        {copiedIndex === index ? (
                          <CheckIcon className="w-4 h-4 text-green-600" />
                        ) : (
                          <CopyIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
