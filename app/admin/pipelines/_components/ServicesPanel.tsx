'use client';

import { Card } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import type { LeadService } from '@/lib/api-client';
import { formatAge } from '../_lib/age';

const SERVICE_LABEL: Record<LeadService['service'], string> = {
  website: 'Website',
  dns: 'DNS',
  email: 'Email',
  domain: 'Domain',
};

export function ServicesPanel({ services }: { services: LeadService[] | null | undefined }) {
  const rows = services ?? [];
  if (rows.length === 0) {
    return (
      <Card title="Customer-facing service status">
        <p className="text-sm text-text-muted">No service rows yet.</p>
      </Card>
    );
  }

  return (
    <Card title="Customer-facing service status">
      <ul className="divide-y divide-border">
        {rows.map((s) => (
          <li key={s.service} className="py-3 flex items-center gap-4">
            <span className="font-medium text-text w-24">
              {SERVICE_LABEL[s.service] ?? s.service}
            </span>
            <span className="flex-1 text-sm text-text-muted">
              {s.progress_label || '—'}
            </span>
            <AdminStatusBadge variant="neutral" label={s.state || '—'} />
            <Tooltip content={s.updated_at}>
              <span className="text-xs text-text-muted cursor-help w-12 text-right">
                {formatAge(s.updated_at)}
              </span>
            </Tooltip>
          </li>
        ))}
      </ul>
    </Card>
  );
}
