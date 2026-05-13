'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { mailboxApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';

function extractErrorMessage(err: any, fallback: string): string {
  if (err?.message) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}

interface PasswordRules {
  length: boolean;
  chars: boolean;
  notContainsIdentity: boolean;
  composition: boolean;
  allPass: boolean;
}

/**
 * Mirrors backend validateMailboxPassword(). Keep in sync.
 */
function checkPasswordRules(
  password: string,
  username: string,
  domain: string
): PasswordRules {
  const length = password.length >= 12 && password.length <= 54;
  const chars = password.length > 0 && /^[!#-~]+$/.test(password);
  const lower = password.toLowerCase();
  const notContainsIdentity =
    password.length > 0 &&
    (!username || !lower.includes(username.toLowerCase())) &&
    (!domain || !lower.includes(domain.toLowerCase()));
  let classes = 0;
  if (/[a-z]/.test(password)) classes++;
  if (/[A-Z]/.test(password)) classes++;
  if (/\d/.test(password)) classes++;
  if (/[^a-zA-Z0-9]/.test(password)) classes++;
  const composition = classes >= 3;
  return {
    length,
    chars,
    notContainsIdentity,
    composition,
    allPass: length && chars && notContainsIdentity && composition,
  };
}

function PasswordRuleList({ rules }: { rules: PasswordRules }) {
  const items: { ok: boolean; label: string }[] = [
    { ok: rules.length, label: '12–54 characters' },
    { ok: rules.composition, label: '3 of: lowercase, uppercase, digit, symbol' },
    { ok: rules.chars, label: 'Printable ASCII only (no spaces or quotes)' },
    { ok: rules.notContainsIdentity, label: 'Does not contain username or domain' },
  ];
  return (
    <ul className="text-xs space-y-0.5 pl-0.5">
      {items.map((it) => (
        <li
          key={it.label}
          className={`flex items-start gap-1.5 ${
            it.ok ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-500'
          }`}
        >
          <span className="font-mono leading-none mt-0.5">{it.ok ? '✓' : '·'}</span>
          <span>{it.label}</span>
        </li>
      ))}
    </ul>
  );
}
import type {
  MailboxPricingTier,
  DomainEmailStatus,
  Mailbox,
  MailAlias,
} from '@/types/mailbox';
import { Mail, Plus, Trash2, Key, ExternalLink, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';

interface DomainEmailSectionProps {
  domainId: string;
  domainName: string;
  onOpenBillingPortal?: () => void;
  openingBillingPortal?: boolean;
}

export function DomainEmailSection({
  domainId,
  domainName,
  onOpenBillingPortal,
  openingBillingPortal = false,
}: DomainEmailSectionProps) {
  const { addToast } = useToastStore();

  // State
  const [loading, setLoading] = useState(true);
  const [emailStatus, setEmailStatus] = useState<DomainEmailStatus | null>(null);
  const [pricingTiers, setPricingTiers] = useState<MailboxPricingTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [aliases, setAliases] = useState<MailAlias[]>([]);

  // Form state
  const [showAddMailbox, setShowAddMailbox] = useState(false);
  const [newMailboxUser, setNewMailboxUser] = useState('');
  const [newMailboxPassword, setNewMailboxPassword] = useState('');
  const [creatingMailbox, setCreatingMailbox] = useState(false);

  const [showAddAlias, setShowAddAlias] = useState(false);
  const [newAliasName, setNewAliasName] = useState('');
  const [newAliasTarget, setNewAliasTarget] = useState('');
  const [creatingAlias, setCreatingAlias] = useState(false);

  const [showResetPassword, setShowResetPassword] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const [enablingEmail, setEnablingEmail] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disablingEmail, setDisablingEmail] = useState(false);
  const [deletingMailbox, setDeletingMailbox] = useState<string | null>(null);
  const [deletingAlias, setDeletingAlias] = useState<string | null>(null);
  const [copiedRecordKey, setCopiedRecordKey] = useState<string | null>(null);
  const [showDnsRecords, setShowDnsRecords] = useState(false);
  const [confirmDeleteMailbox, setConfirmDeleteMailbox] = useState<string | null>(null);

  // Per-mailbox price for billing transparency
  const perMailboxPrice = emailStatus?.tier?.price ?? 0;
  const mailboxCount = mailboxes.length;
  const monthlyTotal = perMailboxPrice * mailboxCount;
  const formatPrice = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const copyRecordValue = useCallback(
    async (key: string, value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopiedRecordKey(key);
        setTimeout(() => setCopiedRecordKey((k) => (k === key ? null : k)), 1500);
      } catch {
        addToast('error', 'Could not copy to clipboard');
      }
    },
    [addToast]
  );

  // Fetch email status and pricing
  const fetchStatus = useCallback(async () => {
    try {
      const status = await mailboxApi.getStatus(domainId);
      setEmailStatus(status);

      if (status.enabled) {
        const [mbData, aliasData] = await Promise.all([
          mailboxApi.listMailboxes(domainId),
          mailboxApi.listAliases(domainId),
        ]);
        setMailboxes(mbData.mailboxes);
        setAliases(aliasData.aliases);
      }
    } catch (err: any) {
      console.error('Failed to fetch email status:', err);
    } finally {
      setLoading(false);
    }
  }, [domainId]);

  const fetchPricing = useCallback(async () => {
    try {
      const data = await mailboxApi.getPricing();
      setPricingTiers(data.tiers);
      if (data.tiers.length > 0) {
        setSelectedTier(data.tiers[0].id);
      }
    } catch (err: any) {
      console.error('Failed to fetch pricing:', err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchPricing();
  }, [fetchStatus, fetchPricing]);

  // Handlers
  const handleEnableEmail = async () => {
    if (!selectedTier) return;
    setEnablingEmail(true);
    try {
      await mailboxApi.enable(domainId, selectedTier);
      addToast('success', 'Email enabled successfully.');
      await fetchStatus();
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to enable email'));
    } finally {
      setEnablingEmail(false);
    }
  };

  const handleDisableEmail = async () => {
    setDisablingEmail(true);
    try {
      await mailboxApi.disable(domainId);
      addToast('success', 'Email disabled.');
      setMailboxes([]);
      setAliases([]);
      await fetchStatus();
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to disable email'));
    } finally {
      setDisablingEmail(false);
      setShowDisableConfirm(false);
    }
  };

  const handleChangePlan = async (tierId: string) => {
    setChangingPlan(true);
    try {
      await mailboxApi.changePlan(domainId, tierId);
      addToast('success', 'Plan updated successfully.');
      setShowChangePlan(false);
      await fetchStatus();
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to change plan'));
    } finally {
      setChangingPlan(false);
    }
  };

  const handleCreateMailbox = async () => {
    if (!newMailboxUser || !newMailboxPassword) return;
    if (!checkPasswordRules(newMailboxPassword, newMailboxUser, domainName).allPass) {
      addToast('error', 'Password does not meet the listed requirements.');
      return;
    }
    setCreatingMailbox(true);
    try {
      await mailboxApi.createMailbox(domainId, newMailboxUser, newMailboxPassword);
      addToast('success', `Mailbox ${newMailboxUser}@${domainName} created.`);
      setNewMailboxUser('');
      setNewMailboxPassword('');
      setShowAddMailbox(false);
      const data = await mailboxApi.listMailboxes(domainId);
      setMailboxes(data.mailboxes);
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to create mailbox'));
    } finally {
      setCreatingMailbox(false);
    }
  };

  const handleDeleteMailbox = async (user: string) => {
    setDeletingMailbox(user);
    try {
      await mailboxApi.deleteMailbox(domainId, user);
      addToast('success', `Mailbox ${user}@${domainName} deleted.`);
      setMailboxes((prev) => prev.filter((m) => m.user !== user));
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to delete mailbox'));
    } finally {
      setDeletingMailbox(null);
    }
  };

  const handleResetPassword = async () => {
    if (!showResetPassword || !resetPasswordValue) return;
    if (!checkPasswordRules(resetPasswordValue, showResetPassword, domainName).allPass) {
      addToast('error', 'Password does not meet the listed requirements.');
      return;
    }
    setResettingPassword(true);
    try {
      await mailboxApi.resetPassword(domainId, showResetPassword, resetPasswordValue);
      addToast('success', 'Password updated.');
      setShowResetPassword(null);
      setResetPasswordValue('');
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to reset password'));
    } finally {
      setResettingPassword(false);
    }
  };

  const handleCreateAlias = async () => {
    if (!newAliasName || !newAliasTarget) return;
    setCreatingAlias(true);
    try {
      await mailboxApi.createAlias(domainId, newAliasName, newAliasTarget);
      addToast('success', `Alias ${newAliasName}@${domainName} created.`);
      setNewAliasName('');
      setNewAliasTarget('');
      setShowAddAlias(false);
      const data = await mailboxApi.listAliases(domainId);
      setAliases(data.aliases);
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to create alias'));
    } finally {
      setCreatingAlias(false);
    }
  };

  const handleDeleteAlias = async (alias: string) => {
    setDeletingAlias(alias);
    try {
      await mailboxApi.deleteAlias(domainId, alias);
      addToast('success', `Alias ${alias}@${domainName} deleted.`);
      setAliases((prev) => prev.filter((a) => a.alias !== alias));
    } catch (err: any) {
      addToast('error', extractErrorMessage(err, 'Failed to delete alias'));
    } finally {
      setDeletingAlias(null);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <Card title="Email" icon={<Mail className="w-5 h-5 text-orange" />}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </Card>
    );
  }

  // Not enabled state
  if (!emailStatus?.enabled) {
    return (
      <Card
        title="Email"
        description="Add email mailboxes to your domain"
        icon={<Mail className="w-5 h-5 text-orange" />}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Choose a plan to enable email for <span className="font-medium text-gray-700 dark:text-gray-200">{domainName}</span>.
            Each mailbox is billed monthly.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {pricingTiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedTier === tier.id
                    ? 'border-orange bg-orange/5'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="font-semibold text-sm text-gray-900 dark:text-white">
                  {tier.tier_name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {tier.storage_gb}GB storage
                </div>
                <div className="text-lg font-bold text-orange mt-2">
                  ${tier.price.toFixed(2)}
                  <span className="text-xs font-normal text-gray-500">/mo per mailbox</span>
                </div>
                {tier.mailbox_limit > 0 && (
                  <div className="text-xs text-gray-400 mt-1">
                    Up to {tier.mailbox_limit} mailboxes
                  </div>
                )}
              </button>
            ))}
          </div>

          <Button
            onClick={handleEnableEmail}
            disabled={!selectedTier || enablingEmail}
          >
            {enablingEmail ? 'Enabling...' : 'Enable Email'}
          </Button>
        </div>
      </Card>
    );
  }

  // Enabled state
  return (
    <Card
      title="Email"
      icon={<Mail className="w-5 h-5 text-orange" />}
      action={
        emailStatus.webmail_url ? (
          <a
            href={emailStatus.webmail_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-orange hover:text-orange-dark flex items-center gap-1"
          >
            Open Webmail <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : null
      }
    >
      <div className="space-y-5">
        {/* Past-due banner */}
        {emailStatus.status === 'suspended' && (
          <div className="flex items-start gap-3 p-3 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                Your last payment failed.
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                Update your card to restore full email service. Mail delivery may be interrupted while the subscription is past due.
              </p>
            </div>
            {onOpenBillingPortal && (
              <button
                type="button"
                onClick={onOpenBillingPortal}
                disabled={openingBillingPortal}
                className="text-xs font-medium text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 whitespace-nowrap disabled:opacity-60"
              >
                {openingBillingPortal ? 'Opening…' : 'Update card →'}
              </button>
            )}
          </div>
        )}

        {/* Plan strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="px-2.5 py-0.5 bg-orange/10 text-orange text-xs font-semibold rounded-full uppercase tracking-wide">
              {emailStatus.tier?.tier_name}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {emailStatus.tier?.storage_gb} GB per mailbox
            </span>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <span
              className="text-sm text-gray-600 dark:text-gray-400"
              title="Billed monthly. Changes are prorated to today."
            >
              {mailboxCount > 0 ? (
                <>
                  {mailboxCount} × ${formatPrice(perMailboxPrice)} ={' '}
                  <span className="text-gray-900 dark:text-white font-medium">
                    ${formatPrice(monthlyTotal)}/mo
                  </span>
                </>
              ) : (
                <>
                  ${formatPrice(perMailboxPrice)}
                  <span className="text-gray-400 dark:text-gray-500">/mo per mailbox</span>
                </>
              )}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChangePlan(!showChangePlan)}
          >
            Increase Storage
          </Button>
        </div>

        {/* Increase Storage Panel */}
        {showChangePlan && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            {pricingTiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => handleChangePlan(tier.id)}
                disabled={changingPlan || tier.id === emailStatus.tier?.id}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  tier.id === emailStatus.tier?.id
                    ? 'border-orange bg-orange/5 opacity-50'
                    : 'border-gray-200 dark:border-gray-700 hover:border-orange'
                }`}
              >
                <div className="font-semibold text-sm">{tier.tier_name}</div>
                <div className="text-xs text-gray-500 mt-1">{tier.storage_gb}GB</div>
                <div className="text-sm font-bold text-orange mt-1">
                  ${tier.price.toFixed(2)}/mo
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Mailboxes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Mailboxes <span className="text-gray-400 dark:text-gray-600 font-normal">· {mailboxes.length}</span>
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddMailbox(!showAddMailbox)}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Mailbox
            </Button>
          </div>

          {showAddMailbox && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="Email address"
                    value={newMailboxUser}
                    onChange={(e) => setNewMailboxUser(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))}
                    placeholder="user"
                    maxLength={64}
                    pattern="[a-zA-Z0-9._-]+"
                  />
                </div>
                <span className="pb-2 text-sm text-gray-500">@{domainName}</span>
              </div>
              <Input
                label="Password"
                type="password"
                value={newMailboxPassword}
                onChange={(e) => setNewMailboxPassword(e.target.value)}
                placeholder="At least 12 characters"
                minLength={12}
                maxLength={54}
              />
              <PasswordRuleList
                rules={checkPasswordRules(newMailboxPassword, newMailboxUser, domainName)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Adds ${formatPrice(perMailboxPrice)}/mo to your subscription, prorated to today.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateMailbox}
                  disabled={
                    !newMailboxUser ||
                    creatingMailbox ||
                    !checkPasswordRules(newMailboxPassword, newMailboxUser, domainName).allPass
                  }
                >
                  {creatingMailbox ? 'Creating...' : 'Create Mailbox'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddMailbox(false);
                    setNewMailboxUser('');
                    setNewMailboxPassword('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {mailboxes.length > 0 ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {mailboxes.map((mb) => {
                const fullEmail = mb.user.includes('@') ? mb.user : `${mb.user}@${mb.domain}`;
                return (
                  <li
                    key={mb.user}
                    className="group flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          mb.suspended ? 'bg-red-400' : 'bg-green-500'
                        }`}
                        title={mb.suspended ? 'Suspended' : 'Active'}
                      />
                      <span className="text-sm text-gray-900 dark:text-white truncate">
                        {fullEmail}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setShowResetPassword(mb.user); setResetPasswordValue(''); }}
                        className="p-1.5 rounded text-gray-500 hover:text-orange hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Reset password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteMailbox(mb.user)}
                        disabled={deletingMailbox === mb.user}
                        className="p-1.5 rounded text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                        title="Delete mailbox"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No mailboxes yet. Click <span className="text-gray-600 dark:text-gray-300 font-medium">Add Mailbox</span> to create one.
            </p>
          )}

          {showResetPassword && (
            <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
              <p className="text-sm font-medium">
                Reset password for{' '}
                <span className="text-orange">{showResetPassword}@{domainName}</span>
              </p>
              <Input
                type="password"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                placeholder="At least 12 characters"
                minLength={12}
                maxLength={54}
              />
              <PasswordRuleList
                rules={checkPasswordRules(
                  resetPasswordValue,
                  showResetPassword || '',
                  domainName
                )}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleResetPassword}
                  disabled={
                    resettingPassword ||
                    !checkPasswordRules(resetPasswordValue, showResetPassword || '', domainName).allPass
                  }
                >
                  {resettingPassword ? 'Updating...' : 'Update Password'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowResetPassword(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        {/* Aliases */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Aliases <span className="text-gray-400 dark:text-gray-600 font-normal">· {aliases.length}</span>
            </h4>
            <Button variant="outline" size="sm" onClick={() => setShowAddAlias(!showAddAlias)}>
              <Plus className="w-4 h-4 mr-1" /> Add Alias
            </Button>
          </div>

          {showAddAlias && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input label="Alias" value={newAliasName} onChange={(e) => setNewAliasName(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))} placeholder="alias" maxLength={64} pattern="[a-zA-Z0-9._-]+" />
                </div>
                <span className="pb-2 text-sm text-gray-500">@{domainName}</span>
              </div>
              <Input label="Forwards to" value={newAliasTarget} onChange={(e) => setNewAliasTarget(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))} placeholder="existing-mailbox" maxLength={64} pattern="[a-zA-Z0-9._-]+" />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateAlias} disabled={!newAliasName || !newAliasTarget || creatingAlias}>
                  {creatingAlias ? 'Creating...' : 'Create Alias'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setShowAddAlias(false); setNewAliasName(''); setNewAliasTarget(''); }}>Cancel</Button>
              </div>
            </div>
          )}

          {aliases.length > 0 ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {aliases.map((a) => (
                <li key={a.alias} className="group flex items-center justify-between gap-3 py-2.5">
                  <div className="text-sm flex items-center gap-2 min-w-0">
                    <span className="text-gray-900 dark:text-white truncate">{a.alias}@{a.domain}</span>
                    <span className="text-gray-300 dark:text-gray-700">&rarr;</span>
                    <span className="text-gray-500 dark:text-gray-400 truncate">{a.target}@{a.domain}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteAlias(a.alias)}
                    disabled={deletingAlias === a.alias}
                    className="p-1.5 rounded text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity disabled:opacity-50"
                    title="Delete alias"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">No aliases yet.</p>
          )}
        </div>

        {/* Required DNS Records (collapsible) */}
        {emailStatus.required_dns_records && emailStatus.required_dns_records.length > 0 && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setShowDnsRecords((v) => !v)}
              className="flex items-center gap-2 w-full text-left group"
              aria-expanded={showDnsRecords}
            >
              {showDnsRecords ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300">
                Required DNS Records <span className="text-gray-400 dark:text-gray-600 font-normal">· {emailStatus.required_dns_records.length}</span>
              </h4>
            </button>
            {showDnsRecords && (
              <div className="mt-3 space-y-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Add these at your domain&apos;s DNS provider. Mail won&apos;t flow
                  until they are in place. Propagation can take up to 24 hours.
                </p>
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {emailStatus.required_dns_records.map((record, idx) => {
                    const key = `${record.type}-${record.host}-${idx}`;
                    const copied = copiedRecordKey === key;
                    return (
                      <li key={key} className="group py-3 first:pt-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-1.5 shrink-0 w-16 pt-0.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              {record.type}
                            </span>
                            {record.priority !== undefined && (
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                {record.priority}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="font-mono text-xs text-gray-500 dark:text-gray-400 shrink-0">
                                {record.host}
                              </code>
                              <span className="text-gray-300 dark:text-gray-700">&rarr;</span>
                              <code className="font-mono text-xs text-gray-900 dark:text-white break-all">
                                {record.value}
                              </code>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-500">
                              {record.description}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyRecordValue(key, record.value)}
                            className="p-1.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0 transition-colors"
                            aria-label="Copy value"
                          >
                            {copied ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Disable Email */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500 dark:text-gray-500">
            Disabling will permanently delete all mailboxes, aliases, and email data for this domain.
          </div>
          <button
            type="button"
            onClick={() => setShowDisableConfirm(true)}
            className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 whitespace-nowrap"
          >
            Disable Email
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDisableConfirm}
        title="Disable Email"
        message={`Are you sure you want to disable email for ${domainName}? This will permanently delete all mailboxes and aliases.`}
        confirmText={disablingEmail ? 'Disabling...' : 'Disable Email'}
        onConfirm={handleDisableEmail}
        onClose={() => setShowDisableConfirm(false)}
        variant="danger"
        isLoading={disablingEmail}
      />

      <ConfirmationModal
        isOpen={confirmDeleteMailbox !== null}
        title="Delete mailbox"
        message={
          confirmDeleteMailbox
            ? mailboxCount === 1
              ? `Delete ${confirmDeleteMailbox}@${domainName}? This is your only mailbox — your subscription will drop to $0.00/mo and all mail in this mailbox will be permanently deleted.`
              : `Delete ${confirmDeleteMailbox}@${domainName}? This will permanently delete all mail in this mailbox and reduce your subscription by $${formatPrice(perMailboxPrice)}/mo, prorated to today.`
            : ''
        }
        confirmText={deletingMailbox === confirmDeleteMailbox ? 'Deleting...' : 'Delete mailbox'}
        onConfirm={async () => {
          if (!confirmDeleteMailbox) return;
          const user = confirmDeleteMailbox;
          setConfirmDeleteMailbox(null);
          await handleDeleteMailbox(user);
        }}
        onClose={() => setConfirmDeleteMailbox(null)}
        variant="danger"
        isLoading={deletingMailbox === confirmDeleteMailbox}
      />
    </Card>
  );
}
