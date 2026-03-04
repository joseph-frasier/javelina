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
  const [shouldRenderDetails, setShouldRenderDetails] = useState(!defaultMinimized);
  const [isCompact, setIsCompact] = useState(defaultMinimized);
  const [isInitialized, setIsInitialized] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const pendingExpandWidthRef = useRef<{ start: number } | null>(null);
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

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setPrefersReducedMotion(false);
      setIsMobileLayout(false);
      setIsMinimized(persistedMinimized);
      setShouldRenderDetails(!persistedMinimized);
      setIsCompact(persistedMinimized);
      setIsInitialized(true);
      return;
    }

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileQuery = window.matchMedia('(max-width: 639px)');
    const addListener = (
      query: MediaQueryList,
      listener: (event: MediaQueryListEvent) => void
    ) => {
      if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', listener);
        return () => query.removeEventListener('change', listener);
      }
      query.addListener(listener);
      return () => query.removeListener(listener);
    };

    const updateReducedMotion = () => setPrefersReducedMotion(reducedMotionQuery.matches);
    const updateMobileLayout = () => setIsMobileLayout(mobileQuery.matches);

    updateReducedMotion();
    updateMobileLayout();
    setIsMinimized(persistedMinimized);
    setShouldRenderDetails(!persistedMinimized);
    setIsCompact(!mobileQuery.matches && persistedMinimized);
    setIsInitialized(true);

    const cleanupReducedMotion = addListener(reducedMotionQuery, updateReducedMotion);
    const cleanupMobileLayout = addListener(mobileQuery, updateMobileLayout);

    return () => {
      cleanupReducedMotion();
      cleanupMobileLayout();
    };
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
    if (!isInitialized) {
      return;
    }

    if (isMobileLayout) {
      setIsCompact(false);
      return;
    }

    if (isMinimized && !shouldRenderDetails) {
      setIsCompact(true);
      return;
    }

    setIsCompact(false);
  }, [isInitialized, isMobileLayout, isMinimized, shouldRenderDetails]);

  useEffect(() => {
    const containerEl = containerRef.current;
    const detailsEl = detailsRef.current;
    if (!detailsEl || !isInitialized) {
      return;
    }

    if (containerEl) {
      gsap.killTweensOf(containerEl);
    }
    gsap.killTweensOf(detailsEl);

    if (!hasHydratedStateRef.current) {
      gsap.set(detailsEl, {
        height: isMinimized ? 0 : 'auto',
        opacity: isMinimized ? 0 : 1,
        y: isMinimized ? -6 : 0,
      });
      if (containerEl && !isMobileLayout) {
        gsap.set(containerEl, { clearProps: 'maxWidth' });
      }
      hasHydratedStateRef.current = true;
      return;
    }

    const pendingExpandWidth = pendingExpandWidthRef.current;

    if (prefersReducedMotion) {
      if (pendingExpandWidthRef.current) {
        pendingExpandWidthRef.current = null;
      }
      if (isMinimized) {
        gsap.set(detailsEl, { height: 0, opacity: 0, y: -6 });
        if (shouldRenderDetails) {
          setShouldRenderDetails(false);
        }
      } else {
        gsap.set(detailsEl, { height: 'auto', opacity: 1, y: 0 });
      }
      if (containerEl) {
        gsap.set(containerEl, { clearProps: 'maxWidth' });
      }
      if (isMinimized && !isMobileLayout) {
        setIsCompact(true);
      }
      return;
    }

    if (isMinimized) {
      pendingExpandWidthRef.current = null;
      if (!shouldRenderDetails) {
        if (containerEl) {
          gsap.set(containerEl, { clearProps: 'maxWidth' });
        }
        if (!isMobileLayout) {
          setIsCompact(true);
        }
        return;
      }

      gsap.to(detailsEl, {
        height: 0,
        opacity: 0,
        y: -6,
        duration: 0.24,
        ease: 'power2.inOut',
        onComplete: () => {
          setShouldRenderDetails(false);
          if (containerEl) {
            gsap.set(containerEl, { clearProps: 'maxWidth' });
          }
          if (!isMobileLayout) {
            setIsCompact(true);
          }
        },
      });
      return;
    }

    if (pendingExpandWidth && containerEl && !isMobileLayout) {
      pendingExpandWidthRef.current = null;
      gsap.to(containerEl, {
        maxWidth: '100%',
        duration: 0.28,
        ease: 'power2.out',
        onComplete: () => {
          gsap.set(containerEl, { clearProps: 'maxWidth' });
        },
      });
    } else if (containerEl) {
      gsap.set(containerEl, { clearProps: 'maxWidth' });
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
      if (containerEl) {
        gsap.killTweensOf(containerEl);
      }
      gsap.killTweensOf(detailsEl);
    };
  }, [isInitialized, isMinimized, isMobileLayout, prefersReducedMotion, shouldRenderDetails]);

  const handleCopy = async (ns: string, index: number) => {
    try {
      await navigator.clipboard.writeText(ns);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // fallback ignored
    }
  };

  const handleToggleMinimized = () => {
    const nextMinimized = !isMinimized;
    const containerEl = containerRef.current;

    if (!nextMinimized) {
      setIsCompact(false);
      setShouldRenderDetails(true);
      if (containerEl && !prefersReducedMotion && !isMobileLayout) {
        const startWidth = containerEl.offsetWidth;
        pendingExpandWidthRef.current = { start: startWidth };
        gsap.set(containerEl, { maxWidth: startWidth });
      } else {
        pendingExpandWidthRef.current = null;
      }
    } else {
      pendingExpandWidthRef.current = null;
    }

    setIsMinimized(nextMinimized);
  };

  const containerClassName = [
    'max-w-full px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md',
    isMobileLayout ? 'w-full' : isCompact ? 'inline-block w-fit' : 'w-full',
  ].join(' ');
  const contentClassName =
    isCompact && !isMobileLayout
      ? 'text-sm text-blue-800 dark:text-blue-200'
      : 'flex-1 min-w-0 text-sm text-blue-800 dark:text-blue-200';
  const headerRowClassName = isMobileLayout
    ? 'flex items-start justify-between gap-2'
    : 'flex flex-wrap items-center gap-2';
  const headerTextClassName = isMobileLayout
    ? 'font-medium min-w-0 flex-1 leading-tight'
    : 'font-medium';

  return (
    <div
      ref={containerRef}
      data-testid="verification-alert-container"
      className={containerClassName}
    >
      <div className="flex items-start gap-2">
        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>

        <div className={contentClassName}>
          <div className={headerRowClassName}>
            <p className={headerTextClassName}>Next Step: Configure Nameservers</p>
            <button
              type="button"
              onClick={handleToggleMinimized}
              className="inline-flex items-center flex-shrink-0 px-2 py-1 text-xs font-medium rounded border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              aria-expanded={!isMinimized}
              aria-controls={detailsId}
            >
              {isMinimized ? 'Expand' : 'Minimize'}
            </button>
          </div>

          <div
            id={detailsId}
            ref={detailsRef}
            className={shouldRenderDetails ? 'overflow-hidden' : 'hidden'}
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
