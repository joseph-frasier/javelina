'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import Dropdown from '@/components/ui/Dropdown';
import { certificatesApi } from '@/lib/api-client';
import { generateCSR, downloadTextFile } from '@/lib/csr-generator';
import type {
  SslProduct,
  SslCheckoutParams,
  CertificateContact,
  DvAuthMethod,
  ApproverInfo,
} from '@/types/certificates';

interface CertificateCheckoutFormProps {
  selectedProduct: SslProduct;
  initialDomain?: string;
  onBack: () => void;
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

const SERVER_TYPES = [
  { value: 'apache', label: 'Apache' },
  { value: 'nginx', label: 'Nginx' },
  { value: 'iis', label: 'IIS (Windows)' },
  { value: 'exchange', label: 'Microsoft Exchange' },
  { value: 'other', label: 'Other' },
];

const DV_AUTH_OPTIONS: { value: DvAuthMethod; label: string; description: string }[] = [
  {
    value: 'email',
    label: 'Email',
    description: 'Receive a verification email at an admin address for your domain (e.g. admin@yourdomain.com).',
  },
  {
    value: 'dns',
    label: 'DNS',
    description: 'Add a CNAME or TXT record to your domain\'s DNS. Best if you have direct DNS access.',
  },
  {
    value: 'file',
    label: 'File',
    description: 'Upload a small verification file to your web server at a specific URL path.',
  },
];

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

const selectClasses =
  'w-full px-4 py-2.5 rounded-md border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-800 text-orange-dark dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange hover:border-orange/50 transition-colors';

export default function CertificateCheckoutForm({
  selectedProduct,
  initialDomain = '',
  onBack,
}: CertificateCheckoutFormProps) {
  const [domain, setDomain] = useState(initialDomain);
  const [csr, setCsr] = useState('');
  const [serverType, setServerType] = useState('apache');
  const [dvAuthMethod, setDvAuthMethod] = useState<DvAuthMethod>('email');
  const [approverEmail, setApproverEmail] = useState('');
  const [approvers, setApprovers] = useState<ApproverInfo[]>([]);
  const [isLoadingApprovers, setIsLoadingApprovers] = useState(false);
  const [approversError, setApproversError] = useState<string | null>(null);
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

  const updateContact = (field: keyof CertificateContact, value: string) => {
    setContact((prev) => ({ ...prev, [field]: value }));
  };

  const formatPhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `+1.${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+1.${digits.slice(1)}`;
    return phone;
  };

  // Fetch approvers when email auth method is selected and domain is available
  useEffect(() => {
    if (dvAuthMethod !== 'email' || !domain.trim()) {
      setApprovers([]);
      setApproverEmail('');
      setApproversError(null);
      return;
    }

    const fetchApprovers = async () => {
      setIsLoadingApprovers(true);
      setApproversError(null);
      setApprovers([]);
      setApproverEmail('');
      try {
        const data = await certificatesApi.getApprovers(domain.trim(), selectedProduct.product_type);
        setApprovers(data.approvers);
        if (data.approvers.length > 0) {
          setApproverEmail(data.approvers[0].email);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch approver emails';
        setApproversError(message);
      } finally {
        setIsLoadingApprovers(false);
      }
    };

    fetchApprovers();
  }, [dvAuthMethod, domain, selectedProduct.product_type]);

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
      setError('Please enter a domain name first.');
      return;
    }
    if (!contact.org_name.trim()) {
      setError('Please fill in your organization name before generating a certificate.');
      return;
    }
    if (!contact.country) {
      setError('Please select your country before generating a certificate.');
      return;
    }

    setIsGeneratingCsr(true);
    setError(null);
    setCsrError(null);
    setCsrResult(null);

    try {
      const result = await generateCSR({
        commonName: domain.trim(),
        organization: contact.org_name.trim(),
        country: contact.country,
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
        approver_email: dvAuthMethod === 'email' ? approverEmail : undefined,
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
          <div className="flex items-center justify-between gap-4 rounded-lg bg-orange/5 dark:bg-orange/10 px-4 py-3 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="shrink-0 text-xs font-medium uppercase tracking-[0.22em] text-orange">
                SSL Certificate
              </span>
              <span className="truncate font-bold text-orange-dark dark:text-white text-sm">
                {selectedProduct.display_name}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ${selectedProduct.price.toFixed(2)}/yr
              </span>
              <span className="font-black text-orange text-lg">
                ${selectedProduct.price.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Domain */}
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-orange mb-3">Domain</p>
          <div className="mb-5">
            <Input
              label="Domain Name"
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
              helperText={selectedProduct.wildcard ? 'For wildcard certs, enter the base domain (e.g. example.com). The wildcard (*.example.com) will be covered.' : undefined}
            />
          </div>

          {/* CSR */}
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-orange mb-3">Security Certificate</p>

          {/* Generate / Paste toggle */}
          <div className="flex gap-1 p-1 rounded-lg bg-gray-light/50 dark:bg-gray-700/50 mb-4 w-fit">
            <button
              type="button"
              onClick={() => { setCsrMode('generate'); setCsr(''); setCsrGenerated(false); setCsrResult(null); setCsrError(null); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${csrMode === 'generate' ? 'bg-white dark:bg-gray-800 text-orange-dark dark:text-white shadow-sm' : 'text-gray-slate dark:text-gray-400 hover:text-orange-dark'}`}
            >
              Generate for me
            </button>
            <button
              type="button"
              onClick={() => { setCsrMode('manual'); setCsr(''); setCsrGenerated(false); setCsrResult(null); setCsrError(null); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${csrMode === 'manual' ? 'bg-white dark:bg-gray-800 text-orange-dark dark:text-white shadow-sm' : 'text-gray-slate dark:text-gray-400 hover:text-orange-dark'}`}
            >
              I have my own CSR
            </button>
          </div>

          {csrMode === 'generate' ? (
            <div className="mb-5">
              {!csrGenerated ? (
                <div className="p-4 rounded-lg border border-dashed border-gray-light dark:border-gray-600 text-center">
                  <p className="text-sm text-gray-slate dark:text-gray-400 mb-3">
                    We&apos;ll generate a secure certificate key pair for you. Your private key will be automatically downloaded and never sent to our servers.
                  </p>
                  <p className="text-xs text-gray-slate/70 dark:text-gray-500 mb-4">
                    Fill in the domain, organization, and country fields above first.
                  </p>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleGenerateCSR}
                    loading={isGeneratingCsr}
                    disabled={!domain.trim() || !contact.org_name.trim() || !contact.country}
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
                <label className="block text-sm font-medium text-orange-dark dark:text-gray-100 mb-2">
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
                  className="w-full px-4 py-2.5 rounded-md border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-800 text-orange-dark dark:text-gray-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange hover:border-orange/50 transition-colors resize-y"
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

          {/* DV Auth Method */}
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-orange mb-3">Domain Validation Method</p>
          <div className="space-y-2 mb-5">
            {DV_AUTH_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${dvAuthMethod === option.value ? 'border-orange bg-orange/5 dark:bg-orange/10' : 'border-gray-light dark:border-gray-600 hover:border-orange/50'}`}
              >
                <input
                  type="radio"
                  name="dv_auth_method"
                  value={option.value}
                  checked={dvAuthMethod === option.value}
                  onChange={() => setDvAuthMethod(option.value)}
                  className="mt-0.5 accent-orange shrink-0"
                />
                <div>
                  <p className="text-sm font-medium text-orange-dark dark:text-gray-100">{option.label}</p>
                  <p className="text-xs text-gray-slate dark:text-gray-400 mt-0.5">{option.description}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Approver email selector (email method only) */}
          {dvAuthMethod === 'email' && (
            <div className="mb-5">
              {isLoadingApprovers && (
                <p className="text-sm text-gray-slate dark:text-gray-400">Loading approver addresses...</p>
              )}
              {approversError && (
                <p className="text-sm text-red-600 dark:text-red-400">{approversError}</p>
              )}
              {!isLoadingApprovers && !approversError && approvers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-orange-dark mb-2">
                    Approver Email
                  </label>
                  <select
                    value={approverEmail}
                    onChange={(e) => setApproverEmail(e.target.value)}
                    required
                    className={selectClasses}
                  >
                    {approvers.map((a) => (
                      <option key={a.email} value={a.email}>
                        {a.email}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-gray-slate dark:text-gray-400">
                    A verification email will be sent to this address.
                  </p>
                </div>
              )}
              {!isLoadingApprovers && !approversError && approvers.length === 0 && domain.trim() && (
                <div>
                  <Input
                    label="Approver Email"
                    type="email"
                    placeholder="admin@example.com"
                    value={approverEmail}
                    onChange={(e) => setApproverEmail(e.target.value)}
                    required
                    helperText="Enter the admin email address for your domain."
                  />
                </div>
              )}
              {!domain.trim() && (
                <p className="text-sm text-gray-slate dark:text-gray-400">
                  Enter a domain name above to see available approver addresses.
                </p>
              )}
            </div>
          )}

          {/* Server Type */}
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-orange mb-3">Server Type</p>
          <div className="mb-5">
            <Dropdown
              label="Web Server"
              value={serverType}
              onChange={setServerType}
              options={SERVER_TYPES}
            />
          </div>

          {/* Contact */}
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-orange mb-3">Admin Contact</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <Input
              label="First Name"
              value={contact.first_name}
              onChange={(e) => updateContact('first_name', e.target.value)}
              required
            />
            <Input
              label="Last Name"
              value={contact.last_name}
              onChange={(e) => updateContact('last_name', e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              value={contact.email}
              onChange={(e) => updateContact('email', e.target.value)}
              required
            />
            <Input
              label="Phone"
              placeholder="(555) 123-4567"
              value={contact.phone}
              onChange={(e) => updateContact('phone', e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <Input
              label="Organization"
              value={contact.org_name}
              onChange={(e) => updateContact('org_name', e.target.value)}
              required
            />
            <Input
              label="Title"
              helperText="Optional"
              value={contact.title || ''}
              onChange={(e) => updateContact('title', e.target.value)}
            />
          </div>

          {/* Address */}
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-orange mb-3">Address</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <div className="md:col-span-2">
              <Input
                label="Address"
                value={contact.address1}
                onChange={(e) => updateContact('address1', e.target.value)}
                helperText="Include suite, unit, etc. if needed"
                required
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Address Line 2"
                helperText="Optional"
                value={contact.address2 || ''}
                onChange={(e) => updateContact('address2', e.target.value)}
              />
            </div>
            <Input
              label="City"
              value={contact.city}
              onChange={(e) => updateContact('city', e.target.value)}
              required
            />
            <Dropdown
              label="State"
              value={contact.state}
              onChange={(val) => updateContact('state', val)}
              options={[
                { value: '', label: 'Select state' },
                ...US_STATES.map((s) => ({ value: s, label: s })),
              ]}
            />
            <Input
              label="ZIP / Postal Code"
              value={contact.postal_code}
              onChange={(e) => updateContact('postal_code', e.target.value)}
              required
            />
            <Dropdown
              label="Country"
              value={contact.country}
              onChange={(val) => updateContact('country', val)}
              options={[
                { value: 'US', label: 'United States' },
                { value: 'CA', label: 'Canada' },
                { value: 'GB', label: 'United Kingdom' },
                { value: 'AU', label: 'Australia' },
              ]}
            />
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
              {isSubmitting ? 'Processing...' : `Pay $${selectedProduct.price.toFixed(2)} & Continue`}
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
