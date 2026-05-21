'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Dropdown from '@/components/ui/Dropdown';
import { certificatesApi, domainsApi } from '@/lib/api-client';
import { generateCSR, downloadTextFile } from '@/lib/csr-generator';
import type { Domain } from '@/types/domains';
import type {
  SslProduct,
  SslCheckoutParams,
  CertificateContact,
  DvAuthMethod,
} from '@/types/certificates';

interface CertificateCheckoutFormProps {
  selectedProduct: SslProduct;
  initialDomain?: string;
  onBack: () => void;
}

const emptyContact = (): CertificateContact => ({
  first_name: '',
  last_name: '',
  org_name: '',
  email: '',
  phone: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'US',
  title: '',
});

export default function CertificateCheckoutForm({
  selectedProduct,
  initialDomain = '',
  onBack,
}: CertificateCheckoutFormProps) {
  const [domain, setDomain] = useState(initialDomain);
  const [userDomains, setUserDomains] = useState<Domain[]>([]);
  const [csr, setCsr] = useState('');
  const serverType = 'apache';
  const dvAuthMethod: DvAuthMethod = 'dns';
  const [contact, setContact] = useState<CertificateContact>(emptyContact());

  const [csrMode, setCsrMode] = useState<'generate' | 'manual'>('generate');
  const [isGeneratingCsr, setIsGeneratingCsr] = useState(false);
  const [csrGenerated, setCsrGenerated] = useState(false);
  const [privateKeyDownloaded, setPrivateKeyDownloaded] = useState(false);
  const privateKeyRef = useRef<string | null>(null);

  const [csrValidating, setCsrValidating] = useState(false);
  const [csrResult, setCsrResult] = useState<{
    valid: boolean;
    domain?: string;
    org_name?: string;
    key_size?: string;
  } | null>(null);
  const [csrError, setCsrError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `+1.${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+1.${digits.slice(1)}`;
    return phone;
  };

  // Fetch user's existing domains for the selector
  useEffect(() => {
    domainsApi.list()
      .then((data) => {
        const active = (data.domains || []).filter((d: Domain) => d.status === 'active');
        setUserDomains(active);
      })
      .catch(() => setUserDomains([]));
  }, []);


  const handleValidateCSR = async () => {
    if (!csr.trim()) return;
    setCsrValidating(true);
    setCsrError(null);
    setCsrResult(null);
    try {
      const result = await certificatesApi.validateCSR(csr.trim(), selectedProduct.product_type);
      setCsrResult(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'CSR validation failed';
      setCsrError(message);
    } finally {
      setCsrValidating(false);
    }
  };

  const handleGenerateCSR = async () => {
    if (!domain.trim()) {
      setError('Please select a domain first.');
      return;
    }

    setIsGeneratingCsr(true);
    setError(null);
    setCsrError(null);
    setCsrResult(null);

    try {
      const result = await generateCSR({
        commonName: domain.trim(),
        organization: contact.org_name.trim() || domain.trim(),
        country: contact.country || 'US',
        state: contact.state || undefined,
        city: contact.city || undefined,
      });

      setCsr(result.csr);
      privateKeyRef.current = result.privateKey;
      setCsrGenerated(true);
      setPrivateKeyDownloaded(false);

      // Auto-trigger private key download
      downloadTextFile(result.privateKey, `${domain.trim().replace(/\./g, '_')}.key`);
      setPrivateKeyDownloaded(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate CSR';
      setCsrError(message);
    } finally {
      setIsGeneratingCsr(false);
    }
  };

  const handleDownloadPrivateKey = () => {
    if (privateKeyRef.current) {
      downloadTextFile(privateKeyRef.current, `${domain.trim().replace(/\./g, '_')}.key`);
      setPrivateKeyDownloaded(true);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!csr.trim()) {
      setError(
        csrMode === 'generate'
          ? 'Please generate your certificate key before continuing. Click the "Generate Certificate Key" button above.'
          : 'Please paste your Certificate Signing Request (CSR) before continuing.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const params: SslCheckoutParams = {
        domain: domain.trim(),
        product_type: selectedProduct.product_type,
        csr: csr.trim(),
        contact_info: {
          ...contact,
          phone: formatPhone(contact.phone),
        },
        dv_auth_method: dvAuthMethod,
        server_type: serverType,
        reg_type: 'new',
      };

      const result = await certificatesApi.checkout(params);

      if (result.checkout_url) {
        window.location.href = result.checkout_url;
      }
    } catch (err: unknown) {
      const anyErr = err as { details?: unknown; message?: string };
      const message = anyErr?.details || anyErr?.message || 'Failed to create checkout session';
      setError(typeof message === 'string' ? message : JSON.stringify(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <Card>
          {/* Order Summary Strip */}
          <div className="flex items-center justify-between gap-4 rounded-lg bg-accent/5 dark:bg-accent/10 px-4 py-3 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="shrink-0 text-xs font-medium uppercase tracking-[0.22em] text-accent">
                SSL Certificate
              </span>
              <span className="truncate font-bold text-text text-sm">
                {selectedProduct.display_name}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {selectedProduct.price === 0 ? (
                <span className="font-black text-green-500 text-lg">Free</span>
              ) : (
                <>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ${selectedProduct.price.toFixed(2)}/yr
                  </span>
                  <span className="font-black text-accent text-lg">
                    ${selectedProduct.price.toFixed(2)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Domain Selection */}
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent mb-3">Domain</p>
          <div className="mb-5">
            {userDomains.length > 0 ? (
              <>
                <Dropdown
                  label="Select a domain"
                  value={domain}
                  onChange={(val) => {
                    setDomain(val);
                    const selected = userDomains.find((d) => d.domain_name === val);
                    if (selected?.contact_info) {
                      const ci = selected.contact_info;
                      setContact({
                        first_name: ci.first_name || '',
                        last_name: ci.last_name || '',
                        org_name: ci.org_name || '',
                        email: ci.email || '',
                        phone: ci.phone || '',
                        title: '',
                        address1: ci.address1 || '',
                        address2: ci.address2 || '',
                        city: ci.city || '',
                        state: ci.state || '',
                        postal_code: ci.postal_code || '',
                        country: ci.country || 'US',
                      });
                    }
                    // Reset CSR when domain changes
                    setCsr('');
                    setCsrGenerated(false);
                    setCsrResult(null);
                    setCsrError(null);
                  }}
                  options={[
                    { value: '', label: 'Choose a domain...' },
                    ...userDomains.map((d) => ({ value: d.domain_name, label: d.domain_name })),
                  ]}
                />
                {selectedProduct.wildcard && domain && (
                  <p className="text-xs text-text-muted mt-1.5">
                    The wildcard (*.{domain}) will be covered by this certificate.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-text-muted p-3 rounded-lg border border-border">
                No active domains found. <Link href="/domains" className="text-accent hover:underline">Register a domain</Link> first.
              </p>
            )}
          </div>

          {/* Contact summary (auto-filled from domain) */}
          {domain && contact.first_name && (
            <div className="mb-5">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent mb-3">Contact Info</p>
              <div className="p-3 rounded-lg border border-border bg-gray-50 dark:bg-gray-800/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-text-muted text-xs">Name</span>
                    <p className="text-text">{contact.first_name} {contact.last_name}</p>
                  </div>
                  <div>
                    <span className="text-text-muted text-xs">Email</span>
                    <p className="text-text">{contact.email}</p>
                  </div>
                  {contact.org_name && (
                    <div>
                      <span className="text-text-muted text-xs">Organization</span>
                      <p className="text-text">{contact.org_name}</p>
                    </div>
                  )}
                  {contact.city && (
                    <div>
                      <span className="text-text-muted text-xs">Location</span>
                      <p className="text-text">{contact.city}{contact.state ? `, ${contact.state}` : ''} {contact.country}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CSR */}
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent mb-3">Security Certificate</p>

          {/* Generate / Paste toggle */}
          <div className="flex gap-1 p-1 rounded-lg bg-surface-alt dark:bg-gray-700/50 mb-4 w-fit">
            <button
              type="button"
              onClick={() => { setCsrMode('generate'); setCsr(''); setCsrGenerated(false); setCsrResult(null); setCsrError(null); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${csrMode === 'generate' ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'}`}
            >
              Generate for me
            </button>
            <button
              type="button"
              onClick={() => { setCsrMode('manual'); setCsr(''); setCsrGenerated(false); setCsrResult(null); setCsrError(null); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${csrMode === 'manual' ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'}`}
            >
              I have my own CSR
            </button>
          </div>

          {csrMode === 'generate' ? (
            <div className="mb-5">
              {!csrGenerated ? (
                <div className="p-4 rounded-lg border border-dashed border-border text-center">
                  <p className="text-sm text-text-muted mb-3">
                    We&apos;ll generate a secure certificate key pair for you. Your private key will be automatically downloaded and never sent to our servers.
                  </p>
                  <p className="text-xs text-text-muted/70 dark:text-gray-500 mb-4">
                    Select a domain above first.
                  </p>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleGenerateCSR}
                    loading={isGeneratingCsr}
                    disabled={!domain.trim()}
                  >
                    {isGeneratingCsr ? 'Generating...' : 'Generate Certificate Key'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-green-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">Certificate key generated successfully</p>
                        <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                          Your private key has been downloaded. Keep it safe — you&apos;ll need it when installing the certificate on your server.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadPrivateKey}
                    >
                      Download Private Key Again
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setCsrGenerated(false); setCsr(''); privateKeyRef.current = null; }}
                    >
                      Regenerate
                    </Button>
                  </div>
                </div>
              )}

              {csrError && (
                <div className="mt-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-400">{csrError}</p>
                </div>
              )}
            </div>
          ) : (
            /* Manual CSR paste mode */
            <div className="mb-5">
              <div className="mb-3">
                <label className="block text-sm font-medium text-text mb-2">
                  Paste your CSR
                </label>
                <textarea
                  value={csr}
                  onChange={(e) => {
                    setCsr(e.target.value);
                    setCsrResult(null);
                    setCsrError(null);
                  }}
                  required
                  rows={8}
                  placeholder="-----BEGIN CERTIFICATE REQUEST-----&#10;...&#10;-----END CERTIFICATE REQUEST-----"
                  className="w-full px-4 py-2.5 rounded-md border border-border bg-surface text-text font-mono text-xs focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-accent hover:border-accent/50 transition-colors resize-y"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleValidateCSR}
                disabled={!csr.trim() || csrValidating}
                loading={csrValidating}
              >
                {csrValidating ? 'Validating...' : 'Validate CSR'}
              </Button>

              {csrResult && (
                <div className={`mt-2 p-3 rounded-lg border text-sm ${csrResult.valid ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                  {csrResult.valid ? (
                    <div className="space-y-1">
                      <p className="font-medium text-green-700 dark:text-green-400">CSR is valid</p>
                      {csrResult.domain && <p className="text-green-600 dark:text-green-500">Domain: <span className="font-mono">{csrResult.domain}</span></p>}
                      {csrResult.key_size && <p className="text-green-600 dark:text-green-500">Key size: {csrResult.key_size}</p>}
                    </div>
                  ) : (
                    <p className="text-red-700 dark:text-red-400">Invalid CSR. Please check and try again.</p>
                  )}
                </div>
              )}

              {csrError && (
                <div className="mt-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-400">{csrError}</p>
                </div>
              )}
            </div>
          )}

          {/* Domain Validation Info */}
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent mb-3">Domain Validation</p>
          <div className="p-3 rounded-lg border border-border bg-gray-50 dark:bg-gray-800/50 mb-5">
            <p className="text-sm font-medium text-text">DNS Validation</p>
            <p className="text-xs text-text-muted mt-1">
              To prove you own this domain, you&apos;ll add a DNS record after checkout. The exact record details (type, name, and value) will be shown on your certificate page with copy buttons — just paste them into your DNS zone.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-4 animate-fadeIn">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" size="lg" className="flex-1" loading={isSubmitting}>
              {isSubmitting ? 'Processing...' : selectedProduct.price === 0 ? 'Get Certificate' : `Pay $${selectedProduct.price.toFixed(2)} & Continue`}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={onBack}
              disabled={isSubmitting}
            >
              Back
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
