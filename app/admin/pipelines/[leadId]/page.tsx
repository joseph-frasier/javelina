'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import Button from '@/components/ui/Button';
import { adminApi, type LeadDetailResponse } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { LeadStateHeader } from '../_components/LeadStateHeader';
import { ServicesPanel } from '../_components/ServicesPanel';

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
              title={`${data.lead.contact_name} — ${PACKAGE_LABEL[data.lead.package]}`}
              subtitle={data.lead.contact_email}
              breadcrumb={[
                { label: 'Admin', href: '/admin' },
                { label: 'Pipelines', href: '/admin/pipelines' },
                { label: data.lead.contact_name },
              ]}
            />
            <div className="space-y-6">
              <LeadStateHeader lead={data.lead} />
              <ServicesPanel services={data.services} />
              {/* Operator actions and agent cards land in subsequent tasks */}
            </div>
          </>
        ) : null}
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
