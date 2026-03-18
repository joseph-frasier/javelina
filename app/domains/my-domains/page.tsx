'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DomainsList from '@/components/domains/DomainsList';
import { domainsApi } from '@/lib/api-client';
import type { Domain } from '@/types/domains';

export default function MyDomainsPage() {
  const searchParams = useSearchParams();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const success = searchParams.get('success');

  // Link domain state
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkDomain, setLinkDomain] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);

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
    if (success === 'true') {
      loadDomains();
    }
  }, [success, loadDomains]);

  const handleLinkDomain = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = linkDomain.trim().toLowerCase();
    if (!trimmed) return;

    setIsLinking(true);
    setLinkError(null);
    setLinkSuccess(null);

    try {
      await domainsApi.link(trimmed);
      setLinkSuccess(`${trimmed} has been linked to your account.`);
      setLinkDomain('');
      setShowLinkForm(false);
      loadDomains();
    } catch (err: any) {
      const message = err?.details || err?.message || 'Failed to link domain';
      setLinkError(typeof message === 'string' ? message : 'Failed to link domain');
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
              onClick={() => {
                setShowLinkForm(true);
                setLinkError(null);
                setLinkSuccess(null);
              }}
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
                setLinkError(null);
                setLinkDomain('');
              }}
              disabled={isLinking}
            >
              Cancel
            </Button>
          </form>
        )}

        {linkError && (
          <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400">{linkError}</p>
          </div>
        )}
      </div>

      {linkSuccess && (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-400 font-medium">{linkSuccess}</p>
        </div>
      )}

      <Card title="My Domains">
        <DomainsList domains={domains} isLoading={isLoading} />
      </Card>
    </div>
  );
}
