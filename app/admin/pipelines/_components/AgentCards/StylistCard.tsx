'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { DesignDirectionReport } from '@/lib/schemas/intake';

interface Props { data: DesignDirectionReport | null }

interface ColorToken {
  role: string;
  hex: string;
  name: string;
  usage: string;
}

function Swatch({ token }: { token: ColorToken }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-10 h-10 rounded border border-border flex-shrink-0"
        style={{ backgroundColor: token.hex }}
        aria-label={`${token.name} (${token.hex})`}
      />
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium truncate">{token.name}</span>
        <span className="text-[10px] text-text-faint uppercase tracking-wide">{token.role}</span>
        <span className="text-xs text-text-muted font-mono">{token.hex}</span>
      </div>
    </div>
  );
}

export function StylistCard({ data }: Props) {
  const [showRaw, setShowRaw] = useState(false);

  if (!data) {
    return (
      <Card title="Stylist">
        <div className="text-xs text-text-muted -mt-2 mb-3">design_prep</div>
        <p className="text-sm text-text-muted italic">Not yet generated</p>
      </Card>
    );
  }

  const { colors, typography, layout, spacing } = data;

  return (
    <Card title="Stylist">
      <div className="text-xs text-text-muted -mt-2 mb-3">design_prep</div>

      {colors.length > 0 && (
        <section className="mb-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-text-muted mb-2">Palette</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {colors.map((c, i) => (
              <Swatch key={i} token={c} />
            ))}
          </div>
        </section>
      )}

      <section className="mb-4">
        <h4 className="text-xs font-medium uppercase tracking-wide text-text-muted mb-2">Typography</h4>
        <div className="space-y-2">
          <div>
            <span style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight as React.CSSProperties['fontWeight'] }} className="text-lg block">
              {typography.headingFont || '—'}
            </span>
            <span className="text-xs text-text-muted">Heading · weight {typography.headingWeight || '—'}</span>
          </div>
          <div>
            <span style={{ fontFamily: typography.bodyFont, fontWeight: typography.bodyWeight as React.CSSProperties['fontWeight'] }} className="text-base block">
              {typography.bodyFont || '—'}
            </span>
            <span className="text-xs text-text-muted">Body · weight {typography.bodyWeight || '—'}</span>
          </div>
        </div>
      </section>

      {layout.sections.length > 0 && (
        <section className="mb-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
            Layout sections ({layout.sections.length})
          </h4>
          <div className="flex flex-wrap gap-1">
            {layout.sections.map((s, i) => (
              <span key={i} className="px-2 py-0.5 text-xs rounded bg-surface-alt text-text-muted">
                {s.name}
                {s.type ? ` · ${s.type}` : ''}
                {typeof s.columns === 'number' ? ` · ${s.columns}-col` : ''}
              </span>
            ))}
          </div>
          {layout.maxWidth && (
            <p className="mt-2 text-xs text-text-muted">Max width: <span className="font-mono">{layout.maxWidth}</span></p>
          )}
        </section>
      )}

      {(spacing.sectionPadding || spacing.componentGap) && (
        <section>
          <h4 className="text-xs font-medium uppercase tracking-wide text-text-muted mb-2">Spacing</h4>
          <p className="text-xs text-text-muted">
            {spacing.sectionPadding && <>Section padding <span className="font-mono">{spacing.sectionPadding}</span></>}
            {spacing.sectionPadding && spacing.componentGap && ' · '}
            {spacing.componentGap && <>Component gap <span className="font-mono">{spacing.componentGap}</span></>}
          </p>
        </section>
      )}

      <div className="mt-4">
        <button type="button" onClick={() => setShowRaw((v) => !v)} className="text-xs text-text-muted underline">
          {showRaw ? 'Hide raw JSON' : 'View raw JSON'}
        </button>
        {showRaw && (
          <pre className="mt-2 p-3 bg-surface-alt rounded text-xs overflow-auto max-h-80">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </Card>
  );
}
