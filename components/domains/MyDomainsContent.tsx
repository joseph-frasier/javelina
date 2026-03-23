'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DomainsList from '@/components/domains/DomainsList';
import { domainsApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import type { Domain } from '@/types/domains';

interface MyDomainsContentProps {
  success?: boolean;
}

export default function MyDomainsContent({ success }: MyDomainsContentProps) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Link domain state
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkDomain, setLinkDomain] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const { addToast } = useToastStore();

  const loadDomains = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await domainsApi.list();
      setDomains(result.domains || []);
    } catch (err) {
      console.error('Failed to load domains:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  useEffect(() => {
    if (success) {
      loadDomains();
    }
  }, [success, loadDomains]);

  const handleLinkDomain = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = linkDomain.trim().toLowerCase();
    if (!trimmed) return;

    setIsLinking(true);

    try {
      await domainsApi.link(trimmed);
      addToast('success', `${trimmed} has been linked to your account.`);
      setLinkDomain('');
      setShowLinkForm(false);
      loadDomains();
    } catch (err: any) {
      const message = err?.details || err?.message || 'Failed to link domain';
      addToast('error', typeof message === 'string' ? message : 'Failed to link domain');
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Link domain callout */}
      <div className="p-4 rounded-lg bg-orange-light dark:bg-gray-800 border border-gray-light dark:border-gray-700">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-dark dark:text-white">
              Already purchased or transferred a domain through the OpenSRS Storefront?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Link it to your Javelina account to manage it here.
            </p>
          </div>
          {!showLinkForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLinkForm(true)}
            >
              Link domain
            </Button>
          )}
        </div>

        {showLinkForm && (
          <form onSubmit={handleLinkDomain} className="mt-4 flex gap-3 items-end">
            <div className="flex-1">
              <Input
                label="Domain name"
                placeholder="e.g. mydomain.com"
                value={linkDomain}
                onChange={(e) => setLinkDomain(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isLinking || !linkDomain.trim()}
            >
              {isLinking ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Linking...
                </span>
              ) : (
                'Link'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => {
                setShowLinkForm(false);
                setLinkDomain('');
              }}
              disabled={isLinking}
            >
              Cancel
            </Button>
          </form>
        )}
      </div>

      <Card title="My Domains">
        <DomainsList domains={domains} isLoading={isLoading} />
      </Card>
    </div>
  );
}
