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
    // Double-check theme immediately on mount (catches late theme script execution)
    const checkTheme = () => {
      const htmlElement = document.documentElement;
      const hasDarkClass = htmlElement.classList.contains('theme-dark');
      setIsDark(hasDarkClass);
    };
    
    // Check immediately
    checkTheme();
    
    // Set up observer to watch for future changes
    const observer = new MutationObserver(checkTheme);
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
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

