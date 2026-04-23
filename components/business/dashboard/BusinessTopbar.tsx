'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { FONT, t as tokens } from '@/components/business/ui/tokens';
import { Logo } from '@/components/ui/Logo';

export function BusinessTopbar() {
  const t = tokens;
  const user = useAuthStore((s) => s.user);
  const email = user?.email ?? '';
  const initials = (email || 'JB')
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
      <Link href="/business" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }} aria-label="Javelina Business">
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
        {email && (
          <span style={{ fontSize: 13, color: t.textMuted }}>
            Signed in as <span style={{ color: t.text, fontWeight: 500 }}>{email}</span>
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
