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
  // Initialize with current theme state to prevent flash
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('theme-dark');
    }
    return false;
  });

  useEffect(() => {
    // Check initial theme
    const checkTheme = () => {
      const htmlElement = document.documentElement;
      setIsDark(htmlElement.classList.contains('theme-dark'));
    };

    // Initial check (in case theme changed between initialization and mount)
    checkTheme();

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <Image
      src={isDark ? '/JAVELINA_WHITE_BLACK_BACKGROUND-REMOVED.png' : '/JAVELINA LOGO TRANSPARENT BACKGROUND.png'}
      alt="Javelina - Take control of your DNS"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  );
}

