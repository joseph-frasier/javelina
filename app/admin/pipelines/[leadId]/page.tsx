'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import Button from '@/components/ui/Button';
import { adminApi, ApiError, type LeadDetailResponse, type ActionResponse } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { LeadStateHeader } from '../_components/LeadStateHeader';
import { OperatorActions } from '../_components/OperatorActions';
import { HaltPipelineButton } from '../_components/HaltPipelineButton';
import { RetryAgent1Button } from '../_components/RetryAgent1Button';
import { ServiceSection } from '../_components/PipelineDetail/ServiceSection';

const PACKAGE_LABEL = {
  business_starter: 'Starter',
  business_pro: 'Pro',
} as const;

export default function PipelineDetailPage() {
  const params = useParams();
  const leadId = params.leadId as string;
  const { addToast } = useToastStore();
  const [data, setData] = useState<LeadDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.intake.getLead(leadId);
      setData(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load lead';
      setError(msg);
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  }, [leadId, addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const retryAgent1 = useCallback(async () => {
    setBusy(true);
    try {
      await adminApi.intake.retryAgent1(leadId);
      addToast('success', 'Agent 1 retry dispatched');
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.statusCode === 500) {
        addToast('error', 'Something went wrong — try again or contact engineering.');
      } else if (e instanceof ApiError) {
        // 409 (and other 4xx) — surface the backend message verbatim.
        addToast('error', e.details?.error ?? e.message);
      } else {
        addToast('error', e instanceof Error ? e.message : 'Retry failed');
      }
    } finally {
      setBusy(false);
    }
  }, [leadId, addToast, load]);

  const runAction = useCallback(
    async (
      fn: () => Promise<ActionResponse>,
      successMsg: string
    ) => {
      setBusy(true);
      try {
        const res = await fn();
        if ('result' in res && res.result === 'already_applied') {
          addToast('info', `Already applied — lead is in state ${res.status}.`);
        } else {
          addToast('success', successMsg);
        }
        await load();
      } catch (e) {
        const apiErr = e as { details?: { error?: string }; message?: string };
        const msg = apiErr.details?.error ?? apiErr.message ?? 'Action failed';
        addToast('error', msg);
      } finally {
        setBusy(false);
      }
    },
    [load, addToast]
  );

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        {loading && !data ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          </div>
        ) : error && !data ? (
          <div className="p-6 border border-border rounded-lg flex items-center justify-between">
            <span className="text-text-muted">{error}</span>
            <Button size="sm" variant="outline" onClick={load}>
              Retry
            </Button>
          </div>
        ) : data ? (
          <>
            <AdminPageHeader
              title={`${data.lead.contact_name || 'Lead'} — ${PACKAGE_LABEL[data.lead.package] ?? data.lead.package ?? '—'}`}
              subtitle={data.lead.contact_email ?? ''}
              breadcrumb={[
                { label: 'Admin', href: '/admin' },
                { label: 'Pipelines', href: '/admin/pipelines' },
                { label: data.lead.contact_name || data.lead.id },
              ]}
              actions={
                <div className="flex items-center gap-2">
                  <RetryAgent1Button lead={data.lead} busy={busy} onRetry={retryAgent1} />
                  <HaltPipelineButton
                    status={data.lead.status}
                    busy={busy}
                    onHalt={(reason) =>
                      runAction(() => adminApi.intake.markFailed(leadId, reason), 'Pipeline halted.')
                    }
                  />
                </div>
              }
            />
            <div className="space-y-6">
              <LeadStateHeader lead={data.lead} />
              <OperatorActions
                lead={data.lead}
                busy={busy}
                onConfirmScope={() => runAction(() => adminApi.intake.confirmScope(leadId), 'Scope confirmed.')}
                onReject={(reason) => runAction(() => adminApi.intake.reject(leadId, reason), 'Lead routed to custom.')}
              />
              <div className="space-y-4">
                <ServiceSection serviceKey="foundation" lead={data.lead} services={data.services} leadId={leadId} onRefresh={load} />
                <ServiceSection serviceKey="website"    lead={data.lead} services={data.services} leadId={leadId} onRefresh={load} />
                <ServiceSection serviceKey="dns"        lead={data.lead} services={data.services} leadId={leadId} onRefresh={load} />
                <ServiceSection serviceKey="email"      lead={data.lead} services={data.services} leadId={leadId} onRefresh={load} />
                <ServiceSection serviceKey="domain"     lead={data.lead} services={data.services} leadId={leadId} onRefresh={load} />
              </div>
            </div>
          </>
        ) : null}
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
