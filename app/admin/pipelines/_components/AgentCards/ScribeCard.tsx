'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { LeadRecord } from '@/lib/schemas/intake';

interface Props { data: LeadRecord | null }

export function ScribeCard({ data }: Props) {
  const [showRaw, setShowRaw] = useState(false);

  if (!data) {
    return (
      <Card title="Scribe">
        <div className="text-xs text-text-muted -mt-2 mb-3">lead_record</div>
        <p className="text-sm text-text-muted italic">Not yet generated</p>
      </Card>
    );
  }

  const { client, brand, services, seo, businessDetails } = data;
  const allSeo = [...seo.primaryKeywords, ...seo.secondaryKeywords];

  return (
    <Card title="Scribe">
      <div className="text-xs text-text-muted -mt-2 mb-3">lead_record</div>

      <section className="space-y-4">
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-text-muted">Business</h4>
          <p className="text-sm font-medium">{client.businessName || '—'}</p>
          <p className="text-sm text-text-muted">
            {[client.industry, client.industryCategory].filter(Boolean).join(' · ')}
            {client.location && ` · ${client.location}`}
          </p>
          {(businessDetails.yearsInBusiness || businessDetails.serviceArea) && (
            <p className="text-xs text-text-muted mt-1">
              {businessDetails.yearsInBusiness && <>Years: {businessDetails.yearsInBusiness}</>}
              {businessDetails.yearsInBusiness && businessDetails.serviceArea && ' · '}
              {businessDetails.serviceArea && <>Service area: {businessDetails.serviceArea}</>}
            </p>
          )}
        </div>

        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-text-muted">Brand voice</h4>
          {brand.tagline && <p className="text-sm italic">"{brand.tagline}"</p>}
          {brand.tone.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {brand.tone.map((t) => (
                <span key={t} className="px-2 py-0.5 text-xs rounded-full bg-surface-alt text-text-muted">{t}</span>
              ))}
            </div>
          )}
          {brand.voiceGuidelines && (
            <p className="text-sm text-text-muted mt-1">{brand.voiceGuidelines}</p>
          )}
        </div>

        {services.length > 0 && (
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wide text-text-muted">Services</h4>
            <ul className="space-y-1.5">
              {services.map((s, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium">{s.name}</span>
                  {s.description && <span className="text-text-muted"> — {s.description}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {businessDetails.uniqueSellingPoints.length > 0 && (
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wide text-text-muted">Unique selling points</h4>
            <ul className="list-disc list-inside space-y-0.5">
              {businessDetails.uniqueSellingPoints.map((p, i) => (
                <li key={i} className="text-sm">{p}</li>
              ))}
            </ul>
          </div>
        )}

        {allSeo.length > 0 && (
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wide text-text-muted">SEO terms</h4>
            <div className="flex flex-wrap gap-1">
              {seo.primaryKeywords.map((k) => (
                <span key={`p-${k}`} className="px-2 py-0.5 text-xs rounded bg-accent-light text-text">{k}</span>
              ))}
              {seo.secondaryKeywords.map((k) => (
                <span key={`s-${k}`} className="px-2 py-0.5 text-xs rounded bg-surface-alt text-text-muted">{k}</span>
              ))}
            </div>
            {seo.metaDescription && (
              <p className="text-xs text-text-muted mt-2 italic">{seo.metaDescription}</p>
            )}
          </div>
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
