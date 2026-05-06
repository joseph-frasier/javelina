'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Tooltip } from '@/components/ui/Tooltip';
import Button from '@/components/ui/Button';
import { adminApi, type LeadSummary, type LeadStatus, type LeadPackage } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { formatAge } from './_lib/age';
import { blockedOnLabel } from './_lib/blocked-on';
import { STATUS_VARIANT } from './_lib/status-variant';
import { PipelineFilters, type PipelineFiltersValue } from './_components/PipelineFilters';

const PACKAGE_LABEL: Record<LeadPackage, string> = {
  business_starter: 'Starter',
  business_pro: 'Pro',
};

const STATUS_LABEL: Record<LeadStatus, string> = {
  created: 'Created',
  form_submitted: 'Form submitted',
  agents_complete: 'Awaiting review',
  scope_confirmed: 'Scope confirmed',
  provisioning: 'Provisioning',
  live: 'Live',
  routed_to_custom: 'Routed to custom',
  abandoned: 'Abandoned',
  failed: 'Halted',
};

function blockedOnCell(lead: LeadSummary): string {
  const base = blockedOnLabel[lead.status] ?? '—';
  if (
    (lead.status === 'routed_to_custom' || lead.status === 'failed') &&
    lead.scope_rejection_reason
  ) return `${base} · ${lead.scope_rejection_reason}`;
  return base;
}

function readFilters(sp: URLSearchParams): PipelineFiltersValue {
  return {
    status: (sp.get('status') as LeadStatus) || 'all',
    pkg: (sp.get('package') as LeadPackage) || 'all',
    order: (sp.get('order') as 'oldest' | 'newest') || 'oldest',
  };
}

function writeFilters(filters: PipelineFiltersValue): string {
  const sp = new URLSearchParams();
  if (filters.status !== 'all') sp.set('status', filters.status);
  if (filters.pkg !== 'all') sp.set('package', filters.pkg);
  if (filters.order !== 'oldest') sp.set('order', filters.order);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

function AdminPipelinesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToastStore();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [awaitingReviewCount, setAwaitingReviewCount] = useState<number | null>(null);
  const [failedCount, setFailedCount] = useState<number | null>(null);

  const setFilters = (next: PipelineFiltersValue) => {
    router.replace(`/admin/pipelines${writeFilters(next)}`);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const status: LeadStatus | undefined =
      filters.status === 'all' ? undefined : filters.status;

    adminApi.intake
      .listLeads({
        status,
        package: filters.pkg === 'all' ? undefined : filters.pkg,
        order: filters.order,
        limit: 50,
      })
      .then((res) => {
        if (!cancelled) setLeads(res?.leads ?? []);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Failed to load leads';
        setError(msg);
        addToast('error', msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [filters, addToast]);

  // Independent counts for the action-needed chips so they stay accurate
  // regardless of the current filter view. Refetched on every filter change
  // so an operator who just marked a lead failed (or confirmed scope) sees
  // the chip update.
  useEffect(() => {
    let cancelled = false;
    const readTotal = (res: { pagination?: { total: number | null }; leads?: unknown[] }) => {
      const total = res?.pagination?.total;
      // `total` can be null when Supabase couldn't count — fall back to the
      // returned rows length as a lower bound rather than showing nothing.
      return typeof total === 'number' ? total : (res?.leads?.length ?? 0);
    };
    Promise.all([
      adminApi.intake.listLeads({ status: 'agents_complete', limit: 1 }),
      adminApi.intake.listLeads({ status: 'failed', limit: 1 }),
    ])
      .then(([reviewRes, failedRes]) => {
        if (cancelled) return;
        setAwaitingReviewCount(readTotal(reviewRes));
        setFailedCount(readTotal(failedRes));
      })
      .catch(() => { /* non-critical — leave counts as-is */ });
    return () => { cancelled = true; };
  }, [filters]);

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
        <AdminStatusBadge variant="info" label={PACKAGE_LABEL[lead.package] ?? lead.package ?? '—'} dot={false} />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (lead) => (
        <AdminStatusBadge
          variant={STATUS_VARIANT[lead.status] ?? 'neutral'}
          label={STATUS_LABEL[lead.status] ?? lead.status ?? 'Unknown'}
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
        ) : <span>{label}</span>;
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
    <>
      <AdminPageHeader title="Pipelines" subtitle="Operator queue — stuck leads" />
      <PipelineFilters
        value={filters}
        onChange={setFilters}
        awaitingReviewCount={awaitingReviewCount}
        failedCount={failedCount}
      />
      {error ? (
        <div className="p-6 border border-border rounded-lg flex items-center justify-between">
          <span className="text-text-muted">{error}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.replace(window.location.pathname + window.location.search)}
          >
            Retry
          </Button>
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
    </>
  );
}

export default function AdminPipelinesPage() {
  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <Suspense fallback={null}>
          <AdminPipelinesPageContent />
        </Suspense>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
