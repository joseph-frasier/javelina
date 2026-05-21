'use client';

import { FONT, type Tokens } from '@/components/business/ui/tokens';
import type { ServiceState, ServiceTileData } from '@/lib/business/service-status';

interface Props {
  t: Tokens;
  tile: ServiceTileData;
}

function defaultSubLine(state: ServiceState): string {
  switch (state) {
    case 'not_started':
      return 'Waiting to start';
    case 'in_progress':
      return 'In progress';
    case 'needs_input':
      return "We'll let you know if we need anything from you.";
    case 'failed':
      return 'Our team is investigating.';
    case 'live':
      return 'Live';
    case 'not_applicable':
      return 'Not included in your plan.';
  }
}

function StateGlyph({ t, state }: { t: Tokens; state: ServiceState }) {
  const base = {
    width: 26,
    height: 26,
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  } as const;

  if (state === 'live') {
    return (
      <span aria-hidden style={{ ...base, background: t.success, color: '#fff' }}>
        ✓
      </span>
    );
  }
  if (state === 'failed') {
    return (
      <span aria-hidden style={{ ...base, background: t.danger, color: '#fff' }}>
        !
      </span>
    );
  }
  if (state === 'needs_input') {
    return (
      <span aria-hidden style={{ ...base, background: t.warning, color: '#fff' }}>
        ⏸
      </span>
    );
  }
  if (state === 'in_progress') {
    return (
      <span
        aria-hidden
        style={{
          ...base,
          background: 'transparent',
          border: `2px solid ${t.accent}`,
          borderTopColor: 'transparent',
          animation: 'jav-spin 0.9s linear infinite',
        }}
      />
    );
  }
  if (state === 'not_applicable') {
    return (
      <span aria-hidden style={{ ...base, background: t.surfaceAlt, color: t.textFaint }}>
        –
      </span>
    );
  }
  return (
    <span
      aria-hidden
      style={{
        ...base,
        background: t.surfaceAlt,
        border: `2px solid ${t.border}`,
      }}
    />
  );
}

export function ServiceStatusTile({ t, tile }: Props) {
  const subLine = tile.progressLabel ?? defaultSubLine(tile.state);
  const dim = tile.state === 'not_started' || tile.state === 'not_applicable';

  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        padding: '14px 0',
        opacity: dim ? 0.7 : 1,
      }}
    >
      <StateGlyph t={t} state={tile.state} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: t.text,
            fontFamily: FONT,
          }}
        >
          {tile.title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: t.textMuted,
            marginTop: 2,
            fontFamily: FONT,
            lineHeight: 1.5,
          }}
        >
          {subLine}
        </div>
      </div>
    </div>
  );
}

export default ServiceStatusTile;
