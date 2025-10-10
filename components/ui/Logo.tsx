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
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    // Check initial theme immediately and aggressively
    const checkTheme = () => {
      const htmlElement = document.documentElement;
      const hasDarkClass = htmlElement.classList.contains('theme-dark');
      setIsDark(hasDarkClass);
    };

    // Check immediately
    checkTheme();
    
    // Also check after a tiny delay to catch late theme script execution
    const timeoutId = setTimeout(checkTheme, 10);

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  // Render with a fallback during initial detection
  const logoSrc = isDark === null 
    ? '/JAVELINA_WHITE_BLACK_BACKGROUND-REMOVED.png' // Default to white logo (safer for dark backgrounds)
    : isDark 
      ? '/JAVELINA_WHITE_BLACK_BACKGROUND-REMOVED.png' 
      : '/JAVELINA LOGO TRANSPARENT BACKGROUND.png';

  return (
    <Image
      src={logoSrc}
      alt="Javelina - Take control of your DNS"
      width={width}
      height={height}
      className={className}
      priority={priority}
      suppressHydrationWarning
    />
  );
}

