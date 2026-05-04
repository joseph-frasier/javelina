'use client';

import { FONT, type Tokens } from '@/components/business/ui/tokens';
import { Card } from '@/components/business/ui/Card';
import type { Milestone, MilestoneState } from '@/lib/business/build-progress-mock';

interface Props {
  t: Tokens;
  milestones: Milestone[];
}

function elapsed(startedAt?: string, completedAt?: string): string | null {
  if (!startedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const sec = Math.max(0, Math.round((end - start) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem === 0 ? `${min}m` : `${min}m ${rem}s`;
}

function StateGlyph({ t, state }: { t: Tokens; state: MilestoneState }) {
  if (state === 'done') {
    return (
      <span
        aria-hidden
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          background: t.success,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        ✓
      </span>
    );
  }
  if (state === 'failed') {
    return (
      <span
        aria-hidden
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          background: t.danger,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        !
      </span>
    );
  }
  if (state === 'running') {
    return (
      <span
        aria-hidden
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          border: `2px solid ${t.accent}`,
          borderTopColor: 'transparent',
          animation: 'jav-spin 0.9s linear infinite',
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{
        width: 26,
        height: 26,
        borderRadius: 999,
        border: `2px solid ${t.border}`,
        background: t.surfaceAlt,
        flexShrink: 0,
      }}
    />
  );
}

function stateLabel(state: MilestoneState): string {
  switch (state) {
    case 'done':
      return 'Complete';
    case 'running':
      return 'In progress';
    case 'failed':
      return 'Hit a snag — our team is on it';
    case 'pending':
      return 'Waiting';
  }
}

export function BuildProgressCard({ t, milestones }: Props) {
  const allDone = milestones.every((m) => m.state === 'done');
  const failed = milestones.find((m) => m.state === 'failed');
  const running = milestones.find((m) => m.state === 'running');
  const headline = allDone
    ? 'Your site is live'
    : failed
      ? 'We hit a snag — our team is on it'
      : running
        ? running.label
        : 'Getting started…';

  return (
    <Card t={t}>
      <style>{`@keyframes jav-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              color: t.textMuted,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              fontFamily: FONT,
            }}
          >
            Build progress
          </h3>
          <div
            style={{
              marginTop: 6,
              fontSize: 18,
              fontWeight: 600,
              color: t.text,
              fontFamily: FONT,
              letterSpacing: -0.2,
            }}
          >
            {headline}
          </div>
        </div>
        <div style={{ fontSize: 12, color: t.textFaint, fontFamily: FONT }}>
          Updates live as we work
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {milestones.map((m, i) => {
          const isLast = i === milestones.length - 1;
          const dim = m.state === 'pending';
          const time = elapsed(m.startedAt, m.completedAt);
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
                paddingBottom: isLast ? 0 : 14,
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <StateGlyph t={t} state={m.state} />
                {!isLast && (
                  <div
                    style={{
                      width: 2,
                      flex: 1,
                      minHeight: 22,
                      marginTop: 4,
                      background:
                        m.state === 'done' ? t.success : t.border,
                      borderRadius: 1,
                    }}
                  />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0, opacity: dim ? 0.55 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: t.text,
                      fontFamily: FONT,
                    }}
                  >
                    {m.label}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color:
                        m.state === 'failed'
                          ? t.danger
                          : m.state === 'running'
                            ? t.accent
                            : t.textMuted,
                      fontFamily: FONT,
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    {stateLabel(m.state)}
                    {time ? ` · ${time}` : ''}
                  </div>
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
                  {m.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default BuildProgressCard;
