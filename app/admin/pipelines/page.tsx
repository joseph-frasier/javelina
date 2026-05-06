'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Tooltip } from '@/components/ui/Tooltip';
import Button from '@/components/ui/Button';
import { adminApi, type LeadSummary } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { formatAge } from './_lib/age';
import { blockedOnLabel } from './_lib/blocked-on';
import { STATUS_VARIANT } from './_lib/status-variant';

const PACKAGE_LABEL: Record<LeadSummary['package'], string> = {
  business_starter: 'Starter',
  business_pro: 'Pro',
};

const STATUS_LABEL: Record<LeadSummary['status'], string> = {
  created: 'Created',
  form_submitted: 'Form submitted',
  agents_complete: 'Awaiting review',
  scope_confirmed: 'Scope confirmed',
  provisioning: 'Provisioning',
  live: 'Live',
  routed_to_custom: 'Routed to custom',
  abandoned: 'Abandoned',
  failed: 'Failed',
};

function blockedOnCell(lead: LeadSummary): string {
  const base = blockedOnLabel[lead.status] ?? '—';
  if (
    (lead.status === 'routed_to_custom' || lead.status === 'failed') &&
    lead.scope_rejection_reason
  ) {
    return `${base} · ${lead.scope_rejection_reason}`;
  }
  return base;
}

export default function AdminPipelinesPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.intake.listLeads({ order: 'oldest', limit: 50 });
      setLeads(res.leads);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load leads';
      setError(msg);
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: AdminDataTableColumn<LeadSummary>[] = [
    {
      key: 'contact',
      header: 'Org / Contact',
      render: (lead) => (
        <div className="flex flex-col">
          <span className="font-medium text-text">{lead.contact_name}</span>
          <span className="text-xs text-text-muted">{lead.contact_email}</span>
        </div>
      ),
    },
    {
      key: 'package',
      header: 'Package',
      render: (lead) => (
        <AdminStatusBadge variant="info" label={PACKAGE_LABEL[lead.package]} dot={false} />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (lead) => (
        <AdminStatusBadge
          variant={STATUS_VARIANT[lead.status]}
          label={STATUS_LABEL[lead.status]}
        />
      ),
    },
    {
      key: 'age',
      header: 'Age',
      render: (lead) => (
        <Tooltip content={lead.created_at}>
          <span className="cursor-help text-text-muted">{formatAge(lead.created_at)}</span>
        </Tooltip>
      ),
    },
    {
      key: 'blocked_on',
      header: 'Blocked on',
      render: (lead) => {
        const label = blockedOnCell(lead);
        const truncated = label.length > 60 ? `${label.slice(0, 60)}…` : label;
        return label.length > 60 ? (
          <Tooltip content={label}>
            <span className="cursor-help">{truncated}</span>
          </Tooltip>
        ) : (
          <span>{label}</span>
        );
      },
    },
    {
      key: 'last_activity',
      header: 'Last activity',
      render: (lead) => (
        <Tooltip content={lead.updated_at}>
          <span className="cursor-help text-text-muted">{formatAge(lead.updated_at)}</span>
        </Tooltip>
      ),
    },
  ];

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <AdminPageHeader
          title="Pipelines"
          subtitle="Operator queue — stuck leads"
        />

        {error ? (
          <div className="p-6 border border-border rounded-lg flex items-center justify-between">
            <span className="text-text-muted">{error}</span>
            <Button size="sm" variant="outline" onClick={load}>Retry</Button>
          </div>
        ) : (
          <AdminDataTable
            data={leads}
            columns={columns}
            loading={loading}
            getRowId={(lead) => lead.id}
            onRowClick={(lead) => router.push(`/admin/pipelines/${lead.id}`)}
            emptyState={<span>No leads match these filters.</span>}
          />
        )}
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
