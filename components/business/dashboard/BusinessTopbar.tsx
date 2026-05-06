'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useDashboardMode } from '@/lib/hooks/useDashboardMode';
import { FONT } from '@/components/business/ui/tokens';
import {
  useBusinessTheme,
  useBusinessThemeStore,
} from '@/lib/business-theme-store';
import { Logo } from '@/components/ui/Logo';

export function BusinessTopbar() {
  const t = useBusinessTheme();
  const { mode, toggle } = useBusinessThemeStore();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'user';
  const { isMock, toggle: toggleDemoMode } = useDashboardMode();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  const email = user?.email ?? '';
  const initials =
    (email || 'JB')
      .split('@')[0]
      .split(/[._-]/)
      .slice(0, 2)
      .map((s) => s.charAt(0).toUpperCase())
      .join('') || 'JB';

  return (
    <header
      style={{
        height: 60,
        borderBottom: `1px solid ${t.border}`,
        background: t.surface,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        justifyContent: 'space-between',
        fontFamily: FONT,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link
          href="/"
          style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          aria-label="Go to Javelina home"
        >
          <Logo width={120} height={40} />
        </Link>
        {isMock && (
          <span
            aria-label="Demo data mode is active"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: 6,
              background: 'rgba(245, 158, 11, 0.18)',
              color: '#f59e0b',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.2,
            }}
          >
            DEMO
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link
          href="/"
          style={{
            fontSize: 13,
            color: t.textMuted,
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          ← Back to Javelina
        </Link>
        <button
          type="button"
          onClick={toggle}
          aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: `1px solid ${t.border}`,
            background: t.surfaceAlt,
            color: t.textMuted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background .12s, color .12s',
          }}
        >
          {mode === 'dark' ? (
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={t.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={t.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
          <span
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          >
            {mode === 'dark' ? 'Light mode' : 'Dark mode'}
          </span>
        </button>
        {email && (
          <span style={{ fontSize: 13, color: t.text }}>
            <span style={{ color: t.textMuted }}>Signed in as </span>
            <span style={{ color: t.text, fontWeight: 600 }}>{email}</span>
          </span>
        )}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={`User menu for ${email || 'account'}`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: t.accent,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {initials}
          </button>
          {menuOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                minWidth: 200,
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
                padding: 4,
                zIndex: 50,
              }}
            >
              {role === 'superuser' ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    toggleDemoMode();
                    setMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: t.text,
                    fontFamily: FONT,
                    borderRadius: 6,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = t.surfaceAlt;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span>Demo data</span>
                  <span style={{ color: isMock ? t.accent : t.textMuted, fontWeight: 600 }}>
                    {isMock ? 'ON' : 'OFF'}
                  </span>
                </button>
              ) : (
                <div
                  style={{
                    padding: '8px 12px',
                    fontSize: 13,
                    color: t.textMuted,
                    fontFamily: FONT,
                  }}
                >
                  Signed in as {email || 'account'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default BusinessTopbar;
