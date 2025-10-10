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
  const [isDark, setIsDark] = useState<boolean>(() => {
    // Check multiple sources for theme on initialization
    if (typeof window === 'undefined') return false;
    
    // 1. Check localStorage (most reliable during OAuth redirects)
    try {
      const stored = localStorage.getItem('javelina:theme');
      if (stored === 'dark') return true;
      if (stored === 'light') return false;
    } catch (e) {
      // localStorage might not be available
    }
    
    // 2. Check HTML class (might be set by theme script)
    if (document.documentElement.classList.contains('theme-dark')) return true;
    if (document.documentElement.classList.contains('theme-light')) return false;
    
    // 3. Check system preference (default when no stored preference)
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }
    
    // 4. Default to light mode
    return false;
  });

  useEffect(() => {
    // Check initial theme immediately and aggressively
    const checkTheme = () => {
      const htmlElement = document.documentElement;
      const hasDarkClass = htmlElement.classList.contains('theme-dark');
      setIsDark(hasDarkClass);
    };

    // Check immediately
    checkTheme();
    
    // Check multiple times to catch theme script execution
    const timeoutId1 = setTimeout(checkTheme, 0);   // Next tick
    const timeoutId2 = setTimeout(checkTheme, 10);  // 10ms
    const timeoutId3 = setTimeout(checkTheme, 50);  // 50ms
    const timeoutId4 = setTimeout(checkTheme, 100); // 100ms

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      clearTimeout(timeoutId4);
      observer.disconnect();
    };
  }, []);

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

