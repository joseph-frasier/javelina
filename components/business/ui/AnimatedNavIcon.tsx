'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export type AnimatedNavIconName =
  | 'home'
  | 'layout'
  | 'globe'
  | 'server'
  | 'shield'
  | 'chart'
  | 'credit'
  | 'info'
  | 'sparkle';

interface Props {
  name: AnimatedNavIconName;
  size?: number;
  color?: string;
  isHovered?: boolean;
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const CENTER = { transformBox: 'fill-box' as const, transformOrigin: 'center' };

// Keyframe arrays always end at the rest value so the animation always
// completes a full cycle — no snapping mid-motion when hover ends early.
export function AnimatedNavIcon({ name, size = 16, color = 'currentColor', isHovered = false }: Props) {
  const h = isHovered;

  const svgProps = {
    fill: 'none' as const,
    stroke: color,
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  const icons: Record<AnimatedNavIconName, ReactNode> = {
    // House bounces up gently on hover
    home: (
      <motion.g
        animate={{ y: h ? [0, -2, 0] : 0 }}
        transition={h ? { duration: 0.45, ease: EASE_OUT } : { duration: 0 }}
      >
        <polyline points="1.5,8.5 8,2.5 14.5,8.5" />
        <path d="M3.5 8.5V13.5H6.5V11H9.5V13.5H12.5V8.5" />
      </motion.g>
    ),

    // 2×2 dashboard grid — squares pop up in a stagger on hover
    layout: (
      <motion.g
        animate={{ scale: h ? [1, 1.1, 1] : 1 }}
        transition={h ? { duration: 0.4, ease: EASE_OUT } : { duration: 0 }}
        style={{ transformOrigin: '8px 8px' }}
      >
        <rect x="2" y="2" width="5.5" height="5.5" rx="1.2" />
        <rect x="8.5" y="2" width="5.5" height="5.5" rx="1.2" />
        <rect x="2" y="8.5" width="5.5" height="5.5" rx="1.2" />
        <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.2" />
      </motion.g>
    ),

    // Rays do a full 360° spin then land back — fast twinkle
    sparkle: (
      <motion.g
        animate={{ rotate: h ? [0, 360] : 0 }}
        transition={h ? { duration: 0.55, ease: EASE_OUT } : { duration: 0 }}
        style={{ transformOrigin: '8px 8px' }}
      >
        <path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2" />
      </motion.g>
    ),

    // Longitude lines compress flat then open back — simulates one full rotation
    globe: (
      <g>
        <circle cx="8" cy="8" r="5.5" />
        <line x1="2.5" y1="8" x2="13.5" y2="8" />
        <motion.g
          animate={{ scaleX: h ? [1, 0, 1] : 1 }}
          transition={h ? { duration: 0.65, ease: 'easeInOut' } : { duration: 0 }}
          style={{ transformOrigin: '8px 8px' }}
        >
          <path d="M8 2.5c1.7 2 1.7 9 0 11" />
          <path d="M8 2.5c-1.7 2 -1.7 9 0 11" />
        </motion.g>
      </g>
    ),

    // Bottom rack ejects out and slides back in; indicator blinks once
    server: (
      <g>
        <rect x="2.5" y="3" width="11" height="4" rx="1" />
        <motion.g
          animate={{ y: h ? [0, 2.5, 0] : 0 }}
          transition={h ? { duration: 0.5, ease: EASE_OUT } : { duration: 0 }}
        >
          <rect x="2.5" y="9" width="11" height="4" rx="1" />
        </motion.g>
        <motion.circle
          cx="11.5" cy="5" r="0.85"
          fill={color} stroke="none"
          animate={{ opacity: h ? [0.5, 1, 0.1, 1, 0.5] : 0.5 }}
          transition={h ? { duration: 0.55 } : { duration: 0 }}
        />
      </g>
    ),

    // Shield pops up and springs back down
    shield: (
      <motion.path
        d="M8 2L3 4v4c0 3 2.5 5 5 6c2.5-1 5-3 5-6V4L8 2Z"
        animate={{
          scale: h ? [1, 1.18, 1] : 1,
          y: h ? [0, -1.5, 0] : 0,
        }}
        transition={h ? { duration: 0.45, ease: EASE_OUT } : { duration: 0 }}
        style={CENTER}
      />
    ),

    // Chart line bounces upward then settles — rally moment
    chart: (
      <g>
        <motion.polyline
          points="2,12 6,8 9,10 14,4"
          animate={{ y: h ? [0, -2.5, 0] : 0 }}
          transition={h ? { duration: 0.5, ease: EASE_OUT } : { duration: 0 }}
        />
        <line x1="2" y1="13.5" x2="14" y2="13.5" />
      </g>
    ),

    // Card swipes right and returns; stripe flashes
    credit: (
      <g>
        <motion.rect
          x="2" y="4" width="12" height="9" rx="1.5"
          animate={{ x: h ? [0, 2, 0] : 0 }}
          transition={h ? { duration: 0.45, ease: EASE_OUT } : { duration: 0 }}
        />
        <motion.line
          x1="2" y1="7" x2="14" y2="7"
          animate={{ x: h ? [0, 2, 0] : 0, opacity: h ? [1, 0.25, 1] : 1 }}
          transition={h ? { duration: 0.45 } : { duration: 0 }}
        />
      </g>
    ),

    // Info stem bounces up and returns
    info: (
      <g>
        <circle cx="8" cy="8" r="6" />
        <motion.line
          x1="8" y1="7" x2="8" y2="11"
          animate={{ y: h ? [0, -1.5, 0] : 0 }}
          transition={h ? { duration: 0.4, ease: EASE_OUT } : { duration: 0 }}
        />
        <circle cx="8" cy="5" r="0.5" fill={color} stroke="none" />
      </g>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      {...svgProps}
      style={{ flexShrink: 0, display: 'block' }}
    >
      {icons[name]}
    </svg>
  );
}

export default AnimatedNavIcon;
