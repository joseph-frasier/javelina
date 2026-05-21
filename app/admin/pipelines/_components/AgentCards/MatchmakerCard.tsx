'use client';

import { useState } from 'react';
import { DollarSign, GitCompare, Puzzle } from 'lucide-react';
import type { SimilarityReport } from '@/lib/schemas/intake';
import { AdminStatusBadge, type AdminStatusBadgeVariant } from '@/components/admin/AdminStatusBadge';

// Similarity scores come back on a 0–1 scale. Cluster into the same tone
// vocabulary the rest of the admin UI uses so operators can scan a list of
// matches without doing math in their head.
function scoreTone(score: number): { variant: AdminStatusBadgeVariant; bar: string } {
  if (score >= 0.75) return { variant: 'success', bar: 'bg-success' };
  if (score >= 0.5)  return { variant: 'warning', bar: 'bg-warning' };
  return { variant: 'neutral', bar: 'bg-text-faint' };
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function SectionHeader({ icon: Icon, label, count }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
}) {
  return (
    <h4 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
      {typeof count === 'number' && (
        <span className="text-text-faint normal-case font-normal">({count})</span>
      )}
    </h4>
  );
}

export function MatchmakerCard({ data }: { data: SimilarityReport | null }) {
  const [showRaw, setShowRaw] = useState(false);
  if (!data) return null;

  const { matched_projects, reusable_components, estimate_anchors } = data;
  const matchesSorted = [...matched_projects].sort((a, b) => b.similarity_score - a.similarity_score);

  return (
    <div className="space-y-5">
      {/* Estimate anchors */}
      <section>
        <SectionHeader icon={DollarSign} label="Estimate anchors" />
        <div className="p-3 rounded border border-border bg-surface-alt/40">
          <div className="text-lg font-semibold text-text">
            {formatCents(estimate_anchors.low_cents)}
            <span className="text-text-faint font-normal mx-1.5">–</span>
            {formatCents(estimate_anchors.high_cents)}
          </div>
          {estimate_anchors.basis && (
            <div className="text-xs text-text-muted mt-1">
              <span className="text-text-faint uppercase tracking-wide mr-1">Basis:</span>
              {estimate_anchors.basis}
            </div>
          )}
        </div>
      </section>

      {/* Matched projects */}
      {matchesSorted.length > 0 && (
        <section>
          <SectionHeader icon={GitCompare} label="Matched projects" count={matchesSorted.length} />
          <ul className="space-y-2">
            {matchesSorted.map((m, i) => {
              const tone = scoreTone(m.similarity_score);
              const pct = Math.round(m.similarity_score * 100);
              return (
                <li key={`${m.project_id}-${i}`} className="p-3 rounded border border-border">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text truncate">
                        {m.project_name || m.project_id}
                      </div>
                      {m.project_name && (
                        <div className="font-mono text-[11px] text-text-faint truncate">
                          {m.project_id}
                        </div>
                      )}
                    </div>
                    <AdminStatusBadge variant={tone.variant} label={`${pct}% match`} />
                  </div>
                  <div
                    className="h-1 rounded-full bg-surface-alt overflow-hidden mb-2"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className={`h-full ${tone.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                  {m.reasoning && (
                    <div className="text-xs text-text-muted">{m.reasoning}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Reusable components */}
      {reusable_components.length > 0 && (
        <section>
          <SectionHeader icon={Puzzle} label="Reusable components" count={reusable_components.length} />
          <div className="flex flex-wrap gap-1.5">
            {reusable_components.map((c, i) => (
              <span key={i} className="inline-block px-2 py-0.5 text-xs rounded bg-surface-alt text-text-muted">
                {c}
              </span>
            ))}
          </div>
        </section>
      )}

      <div>
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className="text-xs text-text-muted underline"
        >
          {showRaw ? 'Hide raw JSON' : 'View raw JSON'}
        </button>
        {showRaw && (
          <pre className="mt-2 p-3 bg-surface-alt rounded text-xs overflow-auto max-h-80">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
