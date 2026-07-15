'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import DomainsList from '@/components/domains/DomainsList';
import OrgSelect from '@/components/domains/OrgSelect';
import { domainsApi } from '@/lib/api-client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useHierarchyStore } from '@/lib/stores/hierarchy-store';
import type { Domain } from '@/types/domains';

interface MyDomainsContentProps {
  success?: boolean;
}

export default function MyDomainsContent({ success }: MyDomainsContentProps) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useAuthStore();
  const { currentOrgId } = useHierarchyStore();
  const orgs = user?.organizations ?? [];
  const defaultOrgId =
    (currentOrgId && orgs.some((o) => o.id === currentOrgId) ? currentOrgId : undefined) ??
    orgs[0]?.id ??
    '';
  const [selectedOrgId, setSelectedOrgId] = useState(defaultOrgId);

  const loadDomains = useCallback(async () => {
    if (!selectedOrgId) return;
    try {
      setIsLoading(true);
      const result = await domainsApi.list(selectedOrgId);
      setDomains(result.domains || []);
    } catch (err) {
      console.error('Failed to load domains:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  useEffect(() => {
    if (success) {
      loadDomains();
    }
  }, [success, loadDomains]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <OrgSelect value={selectedOrgId} onChange={setSelectedOrgId} orgs={orgs} />
      </div>

      {/* The "Link domain" callout and form are intentionally hidden for now.
          domainsApi.link and POST /api/domains/link remain intact, so restoring
          this is a UI change. See docs/superpowers/specs/2026-07-15-domain-org-selection-design.md */}

      <Card title="My Domains">
        <DomainsList domains={domains} isLoading={isLoading} />
      </Card>
    </div>
  );
}
