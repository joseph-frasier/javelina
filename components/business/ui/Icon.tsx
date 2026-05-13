'use client';
import type { JSX } from 'react';
import type { CSSProperties } from 'react';

export type IconName =
  | 'check' | 'arrowRight' | 'arrowLeft' | 'plus' | 'external'
  | 'globe' | 'server' | 'shield' | 'chart' | 'credit' | 'edit'
  | 'dots' | 'search' | 'copy' | 'bell' | 'sparkle' | 'x'
  | 'info' | 'lock' | 'rocket' | 'refresh' | 'activity' | 'users'
  | 'sun' | 'moon';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: CSSProperties;
}

// Stroke icons — viewBox 16, strokeWidth 1.5. Shapes lifted from the mockup.
const PATHS: Record<IconName, JSX.Element> = {
  check: <polyline points="3,8 7,12 13,4" />,
  arrowRight: (
    <g><line x1="3" y1="8" x2="13" y2="8" /><polyline points="9,4 13,8 9,12" /></g>
  ),
  arrowLeft: (
    <g><line x1="3" y1="8" x2="13" y2="8" /><polyline points="7,4 3,8 7,12" /></g>
  ),
  plus: (
    <g><line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" /></g>
  ),
  external: (
    <g><polyline points="10,3 13,3 13,6" /><line x1="13" y1="3" x2="8" y2="8" /><path d="M11 9v3H3V4h3" /></g>
  ),
  globe: (
    <g><circle cx="8" cy="8" r="5.5" /><line x1="2.5" y1="8" x2="13.5" y2="8" /><path d="M8 2.5c1.7 2 1.7 9 0 11M8 2.5c-1.7 2 -1.7 9 0 11" /></g>
  ),
  server: (
    <g><rect x="2.5" y="3" width="11" height="4" rx="1" /><rect x="2.5" y="9" width="11" height="4" rx="1" /></g>
  ),
  shield: <path d="M8 2L3 4v4c0 3 2.5 5 5 6c2.5-1 5-3 5-6V4L8 2Z" />,
  chart: (
    <g><polyline points="2,12 6,8 9,10 14,4" /><line x1="2" y1="13.5" x2="14" y2="13.5" /></g>
  ),
  credit: (
    <g><rect x="2" y="4" width="12" height="9" rx="1.5" /><line x1="2" y1="7" x2="14" y2="7" /></g>
  ),
  edit: <g><path d="M11 3l2 2l-8 8H3v-2z" /></g>,
  dots: (
    <g>
      <circle cx="4" cy="8" r="0.8" />
      <circle cx="8" cy="8" r="0.8" />
      <circle cx="12" cy="8" r="0.8" />
    </g>
  ),
  search: (
    <g><circle cx="7" cy="7" r="4" /><line x1="10" y1="10" x2="13.5" y2="13.5" /></g>
  ),
  copy: (
    <g><rect x="5" y="5" width="8" height="8" rx="1.5" /><path d="M3 11V4a1 1 0 011-1h7" /></g>
  ),
  bell: (
    <g><path d="M4 11V7a4 4 0 018 0v4l1 1H3z" /><path d="M7 13.5a1.5 1.5 0 003 0" /></g>
  ),
  sparkle: (
    <g><path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2" /></g>
  ),
  x: (
    <g><line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" /></g>
  ),
  info: (
    <g>
      <circle cx="8" cy="8" r="6" />
      <line x1="8" y1="7" x2="8" y2="11" />
      <circle cx="8" cy="5" r="0.5" />
    </g>
  ),
  lock: (
    <g><rect x="4" y="7" width="8" height="6" rx="1" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" /></g>
  ),
  rocket: (
    <g><path d="M9 3c3 0 4 1 4 4c0 0-2 1-2 3l-2 2l-3-3l2-2c2 0 3-2 3-2zM6 10l-2 2l1 1l2-2" /></g>
  ),
  refresh: (
    <g><path d="M3 8a5 5 0 018.5-3.5L13 6M13 3v3h-3" /><path d="M13 8a5 5 0 01-8.5 3.5L3 10M3 13v-3h3" /></g>
  ),
  activity: <polyline points="2,8 5,8 7,3 10,13 12,8 14,8" />,
  users: (
    <g>
      <circle cx="6" cy="6" r="2.5" />
      <path d="M2 13c0-2 2-3.5 4-3.5s4 1.5 4 3.5" />
      <circle cx="11" cy="6" r="2" />
      <path d="M10 9.5c2 0 4 1 4 3" />
    </g>
  ),
  sun: (
    <g>
      <circle cx="8" cy="8" r="3" />
      <line x1="8" y1="1.5" x2="8" y2="3" />
      <line x1="8" y1="13" x2="8" y2="14.5" />
      <line x1="1.5" y1="8" x2="3" y2="8" />
      <line x1="13" y1="8" x2="14.5" y2="8" />
      <line x1="3.4" y1="3.4" x2="4.5" y2="4.5" />
      <line x1="11.5" y1="11.5" x2="12.6" y2="12.6" />
      <line x1="3.4" y1="12.6" x2="4.5" y2="11.5" />
      <line x1="11.5" y1="4.5" x2="12.6" y2="3.4" />
    </g>
  ),
  moon: <path d="M13 9.5A5 5 0 017.5 3a1 1 0 00-1.2 1.2A5.5 5.5 0 0011.8 10.7a1 1 0 001.2-1.2z" />,
};

export function Icon({ name, size = 16, color = 'currentColor', style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
    >
      {PATHS[name] ?? null}
    </svg>
  );
}

export default Icon;
