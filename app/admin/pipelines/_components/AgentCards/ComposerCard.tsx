'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { ContentPlanReport } from '@/lib/schemas/intake';

interface Props { data: ContentPlanReport | null }

export function ComposerCard({ data }: Props) {
  const [showRaw, setShowRaw] = useState(false);

  if (!data) {
    return (
      <Card title="Composer">
        <div className="text-xs text-text-muted -mt-2 mb-3">copy_prep</div>
        <p className="text-sm text-text-muted italic">Not yet generated</p>
      </Card>
    );
  }

  const heroSection = data.heroSection ?? { headline: '', subheadline: '', ctaText: '' };
  const brandVoice = data.brandVoice ?? { tone: '', personality: '', languageGuidelines: [] };
  const pages = data.pages ?? [];
  const missingAssets = data.missingAssets ?? [];

  return (
    <Card title="Composer">
      <div className="text-xs text-text-muted -mt-2 mb-3">copy_prep</div>

      {missingAssets.length > 0 && (
        <div className="mb-4 p-3 rounded border border-warning/30 bg-warning-soft">
          <p className="text-xs font-medium uppercase tracking-wide text-warning mb-2">
            Missing assets ({missingAssets.length})
          </p>
          <ul className="space-y-1.5">
            {missingAssets.map((m, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium">{m.asset}</span>
                {m.why_needed && <span className="text-text-muted"> — {m.why_needed}</span>}
                {m.example && (
                  <span className="block text-xs text-text-muted italic mt-0.5">e.g. {m.example}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="mb-4">
        <h4 className="text-xs font-medium uppercase tracking-wide text-text-muted">Hero</h4>
        <p className="text-base font-semibold mt-1">{heroSection.headline || '—'}</p>
        {heroSection.subheadline && (
          <p className="text-sm text-text-muted mt-0.5">{heroSection.subheadline}</p>
        )}
        {heroSection.ctaText && (
          <span className="inline-block mt-2 px-3 py-1 text-xs rounded bg-accent-soft text-text">
            {heroSection.ctaText}
          </span>
        )}
      </section>

      {(brandVoice.tone || brandVoice.personality) && (
        <section className="mb-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-text-muted">Voice</h4>
          <p className="text-sm">
            {[brandVoice.tone, brandVoice.personality].filter(Boolean).join(' · ')}
          </p>
        </section>
      )}

      <section>
        <h4 className="text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
          Pages ({pages.length})
        </h4>
        {pages.length === 0 ? (
          <p className="text-sm text-text-muted">No pages in this plan.</p>
        ) : (
          <ul className="space-y-3">
            {pages.map((p, i) => (
              <li key={i} className="border border-border rounded p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{p.name}</span>
                  {p.metaTitle && (
                    <span className="text-xs text-text-muted truncate" title={p.metaTitle}>
                      {p.metaTitle}
                    </span>
                  )}
                </div>
                {(p.sections ?? []).length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {(p.sections ?? []).map((s, j) => (
                      <li key={j} className="text-xs text-text-muted">
                        <span className="font-mono uppercase tracking-wide">{s.type}</span>
                        {s.heading && <span> · {s.heading}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

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
