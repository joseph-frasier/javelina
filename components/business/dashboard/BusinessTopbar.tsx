'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { FONT } from '@/components/business/ui/tokens';
import {
  useBusinessTheme,
  useBusinessThemeStore,
} from '@/lib/business-theme-store';
import { Logo } from '@/components/ui/Logo';
import { Icon } from '@/components/business/ui/Icon';

export function BusinessTopbar() {
  const t = useBusinessTheme();
  const mode = useBusinessThemeStore((s) => s.mode);
  const toggle = useBusinessThemeStore((s) => s.toggle);
  const user = useAuthStore((s) => s.user);
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
      <Link
        href="/business"
        style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
        aria-label="Javelina Business"
      >
        <Logo width={120} height={40} />
      </Link>
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
          <Icon name={mode === 'dark' ? 'sun' : 'moon'} size={15} color={t.textMuted} />
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
          <span style={{ fontSize: 13, color: t.textMuted }}>
            Signed in as{' '}
            <span style={{ color: t.text, fontWeight: 500 }}>{email}</span>
          </span>
        )}
        <div
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
          }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}

export default BusinessTopbar;
