'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function Logo({ className = '', width = 150, height = 40, priority = false }: LogoProps) {
  // Start with null to avoid hydration mismatch, then detect on client
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    const checkTheme = () => {
      // 1. Check HTML class first (set by theme script in head)
      if (document.documentElement.classList.contains('theme-dark')) {
        setIsDark(true);
        return;
      }
      if (document.documentElement.classList.contains('theme-light')) {
        setIsDark(false);
        return;
      }
      
      // 2. Check localStorage
      try {
        const stored = localStorage.getItem('javelina:theme');
        if (stored === 'dark') {
          setIsDark(true);
          return;
        }
        if (stored === 'light') {
          setIsDark(false);
          return;
        }
      } catch (e) {
        // localStorage might not be available
      }
      
      // 3. Default to light
      setIsDark(false);
    };
    
    // Check immediately on mount
    checkTheme();
    
    // Set up observer to watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    // Fallback: Also check periodically in case observer fails
    const intervalId = setInterval(checkTheme, 500);

    return () => {
      observer.disconnect();
      clearInterval(intervalId);
    };
  }, []);

  // Don't render until we know the theme to avoid flash
  if (isDark === null) {
    return <div style={{ width, height }} />;
  }

  return (
    <Image
      src={isDark ? '/JAVELINA_WHITE_BLACK_BACKGROUND-REMOVED.png' : '/JAVELINA LOGO TRANSPARENT BACKGROUND.png'}
      alt="Javelina - Take control of your DNS"
      width={width}
      height={height}
      className={className}
      priority={priority}
      suppressHydrationWarning
    />
  );
}

