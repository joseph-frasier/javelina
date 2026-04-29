'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { BusinessIntakeData } from '@/lib/business-intake-store';
import { FONT, type Tokens } from '@/components/business/ui/tokens';
import { AnimatedNavIcon, type AnimatedNavIconName } from '@/components/business/ui/AnimatedNavIcon';

interface SideNavProps {
  t: Tokens;
  data: BusinessIntakeData;
}

const ITEMS: { id: string; label: string; icon: AnimatedNavIconName; segment: string | null }[] = [
  { id: 'overview', label: 'Overview', icon: 'sparkle', segment: null },
  { id: 'website', label: 'Website', icon: 'globe', segment: 'website' },
  { id: 'dns', label: 'DNS', icon: 'server', segment: 'dns' },
  { id: 'domains', label: 'Domains', icon: 'shield', segment: 'domains' },
  { id: 'analytics', label: 'Analytics', icon: 'chart', segment: 'analytics' },
  { id: 'billing', label: 'Billing', icon: 'credit', segment: 'billing' },
];


function isActive(pathname: string, orgId: string, segment: string | null): boolean {
  const base = `/business/${orgId}`;
  if (segment === null) return pathname === base;
  return pathname === `${base}/${segment}` || pathname.startsWith(`${base}/${segment}/`);
}

export function SideNav({ t, data }: SideNavProps) {
  const pathname = usePathname() ?? '';
  const orgId = data.orgId;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const planLabel = data.planCode === 'business_pro' ? 'Pro · monthly' : 'Starter · monthly';
  const bizName = data.website.bizName || 'Your business';

  return (
    <aside
      style={{
        width: 240,
        borderRight: `1px solid ${t.border}`,
        background: t.surface,
        padding: '20px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: 10,
          borderRadius: 10,
          background: t.surfaceAlt,
          border: `1px solid ${t.border}`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: t.textFaint,
            fontWeight: 600,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            fontFamily: FONT,
          }}
        >
          Business
        </div>
        <div style={{ marginTop: 4 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: t.text,
                fontFamily: FONT,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {bizName}
            </div>
            <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT }}>{planLabel}</div>
          </div>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {ITEMS.map((it) => {
          const on = isActive(pathname, orgId, it.segment);
          const href = it.segment === null ? `/business/${orgId}` : `/business/${orgId}/${it.segment}`;
          return (
            <Link
              key={it.id}
              href={href}
              onMouseEnter={() => setHoveredId(it.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: FONT,
                fontSize: 13.5,
                fontWeight: on ? 600 : 500,
                color: on ? t.text : t.textMuted,
                background: (on || hoveredId === it.id) ? t.surfaceAlt : 'transparent',
                transition: 'background 0.12s',
                textDecoration: 'none',
              }}
            >
              <AnimatedNavIcon
                name={it.icon}
                size={20}
                color={on ? (it.id === 'overview' ? t.text : t.accent) : t.textMuted}
                isHovered={hoveredId === it.id}
              />
              {it.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: `1px solid ${t.border}` }}>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          onMouseEnter={() => setHoveredId('help')}
          onMouseLeave={() => setHoveredId(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            borderRadius: 8,
            cursor: 'pointer',
            fontFamily: FONT,
            fontSize: 13,
            color: t.textMuted,
            textDecoration: 'none',
          }}
        >
          <AnimatedNavIcon name="info" size={20} color={t.textMuted} isHovered={hoveredId === 'help'} />
          Help &amp; docs
        </a>
      </div>
    </aside>
  );
}

export default SideNav;
