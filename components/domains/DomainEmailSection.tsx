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
import type {
  MailboxPricingTier,
  DomainEmailStatus,
  Mailbox,
  MailAlias,
} from '@/types/mailbox';
import { Plus, Trash2, Key, ExternalLink } from 'lucide-react';

interface DomainEmailSectionProps {
  domainId: string;
  domainName: string;
}

export function DomainEmailSection({ domainId, domainName }: DomainEmailSectionProps) {
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
    if (newMailboxPassword.length < 8) {
      addToast('error', 'Password must be at least 8 characters.');
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
    if (resetPasswordValue.length < 8) {
      addToast('error', 'Password must be at least 8 characters.');
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
      <Card title="Email">
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
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="font-semibold text-sm text-gray-900 dark:text-white">
                  {tier.tier_name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {tier.storage_gb}GB storage
                </div>
                <div className="text-lg font-bold text-accent mt-2">
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
      action={
        emailStatus.webmail_url ? (
          <a
            href={emailStatus.webmail_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent hover:text-text flex items-center gap-1"
          >
            Open Webmail <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : null
      }
    >
      <div className="space-y-6">
        {/* Current Plan */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-accent/10 text-accent text-sm font-medium rounded-full">
              {emailStatus.tier?.tier_name}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {emailStatus.tier?.storage_gb}GB &middot; ${emailStatus.tier?.price.toFixed(2)}/mo per mailbox
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChangePlan(!showChangePlan)}
          >
            Change Plan
          </Button>
        </div>

        {/* Change Plan Panel */}
        {showChangePlan && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            {pricingTiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => handleChangePlan(tier.id)}
                disabled={changingPlan || tier.id === emailStatus.tier?.id}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  tier.id === emailStatus.tier?.id
                    ? 'border-accent bg-accent/5 opacity-50'
                    : 'border-border hover:border-accent'
                }`}
              >
                <div className="font-semibold text-sm">{tier.tier_name}</div>
                <div className="text-xs text-gray-500 mt-1">{tier.storage_gb}GB</div>
                <div className="text-sm font-bold text-accent mt-1">
                  ${tier.price.toFixed(2)}/mo
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Mailboxes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Mailboxes ({mailboxes.length})
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
                placeholder="Min 8 characters"
                minLength={8}
                maxLength={128}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateMailbox}
                  disabled={!newMailboxUser || !newMailboxPassword || creatingMailbox}
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email Address</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {mailboxes.map((mb) => (
                    <tr key={mb.user} className="hover:bg-surface-hover/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {mb.user}@{mb.domain}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          mb.suspended
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {mb.suspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setShowResetPassword(mb.user); setResetPasswordValue(''); }}
                            className="text-gray-500 hover:text-accent"
                            title="Reset password"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMailbox(mb.user)}
                            disabled={deletingMailbox === mb.user}
                            className="text-gray-500 hover:text-red-500"
                            title="Delete mailbox"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No mailboxes yet. Add one above.</p>
          )}

          {showResetPassword && (
            <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
              <p className="text-sm font-medium">
                Reset password for{' '}
                <span className="text-accent">{showResetPassword}@{domainName}</span>
              </p>
              <Input
                type="password"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                placeholder="Min 8 characters"
                minLength={8}
                maxLength={128}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleResetPassword} disabled={!resetPasswordValue || resettingPassword}>
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
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Aliases ({aliases.length})
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
            <div className="space-y-2">
              {aliases.map((a) => (
                <div key={a.alias} className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">{a.alias}@{a.domain}</span>
                    <span className="text-gray-400 mx-2">&rarr;</span>
                    <span className="text-gray-500">{a.target}@{a.domain}</span>
                  </div>
                  <button onClick={() => handleDeleteAlias(a.alias)} disabled={deletingAlias === a.alias} className="text-gray-500 hover:text-red-500" title="Delete alias">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No aliases yet.</p>
          )}
        </div>

        {/* Disable Email */}
        <div className="pt-4 border-t border-border">
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">Disable Email</h4>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1 mb-3">
              This will permanently delete all mailboxes, aliases, and email data for this domain.
            </p>
            <Button variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => setShowDisableConfirm(true)}>
              Disable Email
            </Button>
          </div>
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
    </Card>
  );
}
