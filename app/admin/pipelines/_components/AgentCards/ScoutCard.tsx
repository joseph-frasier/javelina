'use client';

import { useState } from 'react';
import { AlertTriangle, TrendingUp, Building2, Cpu, Users } from 'lucide-react';
import type { ResearchReport } from '@/lib/schemas/intake';
import { AdminStatusBadge, type AdminStatusBadgeVariant } from '@/components/admin/AdminStatusBadge';

type Tone = 'danger' | 'warning' | 'success' | 'muted';

const TONE_TO_BADGE: Record<Tone, AdminStatusBadgeVariant> = {
  danger: 'danger',
  warning: 'warning',
  success: 'success',
  muted: 'neutral',
};

// Severity strings are free-form (z.string()) on the schema side. Map common
// values; unknowns fall back to muted so we don't lie about how scary something
// is just because the model used a synonym.
function severityTone(raw: string): Tone {
  const s = raw.toLowerCase().trim();
  if (['critical', 'high', 'severe', 'urgent'].includes(s)) return 'danger';
  if (['medium', 'moderate', 'med', 'mid'].includes(s)) return 'warning';
  if (['low', 'minor', 'negligible'].includes(s)) return 'success';
  return 'muted';
}

function confidenceTone(raw: string): Tone {
  const s = raw.toLowerCase().trim();
  if (['high'].includes(s)) return 'success';
  if (['medium', 'med', 'moderate'].includes(s)) return 'warning';
  if (['low'].includes(s)) return 'danger';
  return 'muted';
}

const TONE_CHIP: Record<Tone, string> = {
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  success: 'bg-success-soft text-success',
  muted: 'bg-surface-alt text-text-muted',
};

const TONE_BORDER: Record<Tone, string> = {
  danger: 'border-danger/30',
  warning: 'border-warning/40',
  success: 'border-success/30',
  muted: 'border-border',
};

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

function Chip({ tone = 'muted', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded ${TONE_CHIP[tone]}`}>
      {children}
    </span>
  );
}

export function ScoutCard({ data }: { data: ResearchReport | null }) {
  const [showRaw, setShowRaw] = useState(false);
  if (!data) return null;

  const { company_overview, tech_stack_signals, growth_signals, risk_flags, competitor_notes } = data;

  return (
    <div className="space-y-5">
      {/* Company overview */}
      <section>
        <SectionHeader icon={Building2} label="Company overview" />
        <p className="text-sm text-text mb-2">{company_overview.summary}</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {company_overview.likely_size && (
            <Chip>Size: {company_overview.likely_size}</Chip>
          )}
          {company_overview.target_audience && (
            <Chip>Audience: {company_overview.target_audience}</Chip>
          )}
        </div>
        {company_overview.differentiators.length > 0 && (
          <div>
            <div className="text-[11px] text-text-faint uppercase tracking-wide mb-1">Differentiators</div>
            <ul className="list-disc list-inside space-y-0.5 text-sm text-text">
              {company_overview.differentiators.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </div>
        )}
      </section>

      {/* Tech stack signals */}
      <section>
        <SectionHeader icon={Cpu} label="Tech stack signals" />
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {tech_stack_signals.likely_current_stack.map((t, i) => (
            <Chip key={i}>{t}</Chip>
          ))}
          {tech_stack_signals.confidence && (
            <Chip tone={confidenceTone(tech_stack_signals.confidence)}>
              Confidence: {tech_stack_signals.confidence}
            </Chip>
          )}
        </div>
        {tech_stack_signals.inferred_from && (
          <p className="text-xs text-text-muted">
            Inferred from: {tech_stack_signals.inferred_from}
          </p>
        )}
      </section>

      {/* Growth signals */}
      {growth_signals.length > 0 && (
        <section>
          <SectionHeader icon={TrendingUp} label="Growth signals" count={growth_signals.length} />
          <ul className="space-y-2">
            {growth_signals.map((g, i) => (
              <li key={i} className="p-3 rounded border border-border">
                <div className="text-sm font-medium text-text">{g.signal}</div>
                <div className="text-xs text-text-muted mt-0.5">{g.interpretation}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Risk flags */}
      {risk_flags.length > 0 && (
        <section>
          <SectionHeader icon={AlertTriangle} label="Risk flags" count={risk_flags.length} />
          <ul className="space-y-2">
            {risk_flags.map((r, i) => {
              const tone = severityTone(r.severity);
              return (
                <li key={i} className={`p-3 rounded border ${TONE_BORDER[tone]}`}>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="text-sm font-medium text-text">{r.risk}</div>
                    <AdminStatusBadge
                      variant={TONE_TO_BADGE[tone]}
                      label={r.severity || 'unknown'}
                    />
                  </div>
                  {r.mitigation && (
                    <div className="text-xs text-text-muted">
                      <span className="text-text-faint uppercase tracking-wide mr-1">Mitigation:</span>
                      {r.mitigation}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Competitor notes */}
      {competitor_notes.length > 0 && (
        <section>
          <SectionHeader icon={Users} label="Competitor notes" count={competitor_notes.length} />
          <ul className="space-y-2">
            {competitor_notes.map((c, i) => (
              <li key={i} className="p-3 rounded border border-border">
                <div className="text-[11px] text-text-faint uppercase tracking-wide mb-0.5">
                  {c.competitor_type}
                </div>
                <div className="text-sm text-text">{c.observation}</div>
              </li>
            ))}
          </ul>
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
