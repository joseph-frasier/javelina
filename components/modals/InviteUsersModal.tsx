'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useToastStore } from '@/lib/toast-store';
import { usePlanLimits } from '@/lib/hooks/usePlanLimits';
import { useUsageCounts } from '@/lib/hooks/useUsageCounts';
import { organizationsApi } from '@/lib/api-client';

interface InviteUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  /** Plan code from the organization's subscription */
  planCode?: string;
  /** Callback when invitation is successfully sent */
  onSuccess?: () => void;
}

type MemberAssignableRole = 'Admin' | 'Editor' | 'BillingContact' | 'Viewer';

const ROLE_OPTIONS: Array<{
  value: MemberAssignableRole;
  title: string;
  description: string;
}> = [
  {
    value: 'Viewer',
    title: 'Viewer',
    description: 'Can review zones and records without making changes.',
  },
  {
    value: 'Editor',
    title: 'Editor',
    description: 'Can manage DNS changes and support day-to-day operations.',
  },
  {
    value: 'BillingContact',
    title: 'Billing Contact',
    description: 'Can manage billing details and subscription actions.',
  },
  {
    value: 'Admin',
    title: 'Admin',
    description: 'Full access to team settings and organization resources.',
  },
];

export function InviteUsersModal({
  isOpen,
  onClose,
  organizationId,
  organizationName,
  planCode,
  onSuccess,
}: InviteUsersModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberAssignableRole>('Viewer');
  const [errors, setErrors] = useState<{ email?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const addToast = useToastStore((state) => state.addToast);
  
  // Usage tracking - prefer usage API's max values over planCode-based limits
  // This ensures it works for all roles (Editor, Viewer, etc.) without requiring billing access
  const { usage, isLoading: isLoadingUsage, refetch: refetchUsage } = useUsageCounts(organizationId);
  
  // Fallback to planCode-based limits if usage API doesn't return max values
  const { limits: fallbackLimits, tier } = usePlanLimits(planCode);
  
  // Use max from usage API if available, otherwise fall back to planCode-based limits
  const currentMemberCount = usage?.members ?? 0;
  const maxMembers = usage?.maxMembers ?? fallbackLimits.users;
  const isUnlimitedMembers = maxMembers === -1;
  const isAtMemberLimit = !isUnlimitedMembers && currentMemberCount >= maxMembers;
  const percentUsed = maxMembers > 0 ? Math.min(100, Math.round((currentMemberCount / maxMembers) * 100)) : 0;
  const seatsRemaining = isUnlimitedMembers ? Number.POSITIVE_INFINITY : Math.max(0, maxMembers - currentMemberCount);
  const isNearLimit = !isAtMemberLimit && percentUsed >= 80;

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleUpgradeClick = () => {
    router.push(`/settings/billing/${organizationId}?openModal=true`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Block if at limit
    if (isAtMemberLimit) {
      setErrors({ general: 'Team member limit reached. Please upgrade your plan.' });
      return;
    }

    if (!email) {
      setErrors({ email: 'Email is required' });
      return;
    }

    if (email.length > 254) {
      setErrors({ email: 'Email address must be 254 characters or fewer' });
      return;
    }

    if (!validateEmail(email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setIsLoading(true);

    try {
      // Call the real API to send the invitation
      await organizationsApi.addMember(organizationId, {
        email,
        role,
      });

      addToast('success', `Invitation sent to ${email} for ${organizationName}.`);
      
      // Refetch usage counts to update the member count
      await refetchUsage();

      // Reset form
      setEmail('');
      setRole('Viewer');

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      
      // Handle specific error cases
      if (error?.code === 'LIMIT_EXCEEDED' || error?.details?.code === 'MEMBER_LIMIT_REACHED') {
        setErrors({ general: 'Team member limit reached. Please upgrade your plan.' });
        addToast('error', 'Team member limit reached. Please upgrade your plan.');
      } else if (error?.details?.code === 'ALREADY_MEMBER' || error?.code === 'ALREADY_MEMBER') {
        setErrors({ email: 'That user is already a member of this organization.' });
        addToast('error', 'That user is already a member of this organization.');
      } else if (error?.details?.code === 'INVITE_ALREADY_PENDING' || error?.code === 'INVITE_ALREADY_PENDING') {
        setErrors({ email: 'An invitation for this email is already pending.' });
        addToast('error', 'An invitation for this email is already pending.');
      } else {
        const errorMessage = error?.message || error?.error || 'Failed to send invitation';
        setErrors({ general: errorMessage });
        addToast('error', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('Viewer');
    setErrors({});
    onClose();
  };

  const usageToneClasses = isAtMemberLimit
    ? {
        card: 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10',
        badge: 'border-red-200 bg-red-100 text-red-700 dark:border-red-400/20 dark:bg-red-500/15 dark:text-red-200',
        bar: 'bg-red-500',
        accent: 'text-red-700 dark:text-red-200',
      }
    : isNearLimit
    ? {
        card: 'border-orange/20 bg-orange/10 dark:border-orange/30 dark:bg-orange/10',
        badge: 'border-orange/20 bg-orange/15 text-orange-dark dark:border-orange/20 dark:bg-orange/15 dark:text-orange-100',
        bar: 'bg-orange',
        accent: 'text-orange-dark dark:text-orange-100',
      }
    : {
        card: 'border-blue-200 bg-blue-50 dark:border-blue-electric/25 dark:bg-blue-electric/10',
        badge: 'border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-electric/20 dark:bg-blue-electric/15 dark:text-blue-100',
        bar: 'bg-blue-electric',
        accent: 'text-blue-700 dark:text-blue-100',
      };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite Team Member"
      eyebrow={organizationName}
      subtitle="Add a teammate with the right level of access. Invitations are sent immediately and can be managed from the team panel."
      size="large"
      bodyClassName="space-y-6"
      headerContent={
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-gray-light bg-white px-3 py-1 text-xs font-medium text-gray-slate dark:border-white/10 dark:bg-white/5 dark:text-white/70">
            {currentMemberCount} active {currentMemberCount === 1 ? 'member' : 'members'}
          </span>
          <span className="rounded-full border border-gray-light bg-white px-3 py-1 text-xs font-medium text-gray-slate dark:border-white/10 dark:bg-white/5 dark:text-white/70">
            {isUnlimitedMembers ? 'Unlimited seats' : `${seatsRemaining} seat${seatsRemaining === 1 ? '' : 's'} available`}
          </span>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="rounded-[22px] border border-gray-light bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-orange-dark dark:text-[#fff3ea]">Seat availability</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-orange-dark dark:text-white">
                {isUnlimitedMembers ? 'Unlimited' : `${currentMemberCount}/${maxMembers}`}
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${usageToneClasses.badge}`}>
              {isAtMemberLimit ? 'Limit reached' : isNearLimit ? 'Almost full' : 'Seats available'}
            </span>
          </div>

          <p className={`mt-3 text-sm leading-6 ${usageToneClasses.accent}`}>
            {isAtMemberLimit
              ? `Your ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan has no remaining team seats. Upgrade to invite more people to ${organizationName}.`
              : isNearLimit
              ? `${seatsRemaining} seat${seatsRemaining === 1 ? '' : 's'} left on ${tier.charAt(0).toUpperCase() + tier.slice(1)}. You can still send this invite now.`
              : `Invite someone new to ${organizationName} and assign access before they join.`}
          </p>

          {!isUnlimitedMembers && (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-gray-slate dark:text-white/45">
                <span>Seat usage</span>
                <span>{percentUsed}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-light/70 dark:bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${usageToneClasses.bar}`}
                  style={{ width: `${percentUsed}%` }}
                />
              </div>
            </div>
          )}

          <div className={`mt-5 rounded-2xl border p-4 ${usageToneClasses.card}`}>
            <p className="text-sm font-medium text-orange-dark dark:text-[#fff3ea]">What they can do</p>
            <ul className="mt-3 space-y-3 text-sm text-gray-slate dark:text-white/70">
              <li>
                Assign a role now so the invite lands with the right permissions.
              </li>
              <li>
                Pending invites can still be reviewed or revoked from team management.
              </li>
              <li>
                Billing access is only granted when you explicitly choose Billing Contact.
              </li>
            </ul>
          </div>
        </section>

        {isAtMemberLimit ? (
          <section className="rounded-[22px] border border-red-500/25 bg-[linear-gradient(180deg,rgba(127,29,29,0.28),rgba(18,18,18,0.72))] p-6 [.theme-light_&]:border-red-200 [.theme-light_&]:bg-red-50">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center text-red-200 [.theme-light_&]:text-red-700">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-7.938 4h15.876c1.21 0 1.967-1.31 1.36-2.362L13.36 4.638c-.606-1.053-2.113-1.053-2.72 0L2.702 16.638c-.607 1.052.15 2.362 1.36 2.362z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xl font-semibold text-[#fff3ea] [.theme-light_&]:text-red-800">Team member limit reached</h4>
                <p className="mt-2 text-sm leading-6 text-red-100/80 [.theme-light_&]:text-red-700">
                  Upgrade your plan to unlock more seats, then reopen this modal to send the invite.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 [.theme-light_&]:border-red-100 [.theme-light_&]:bg-white/80">
                <p className="text-xs uppercase tracking-[0.24em] text-white/40 [.theme-light_&]:text-gray-slate">Current usage</p>
                <p className="mt-2 text-2xl font-semibold text-white [.theme-light_&]:text-orange-dark">{currentMemberCount}/{maxMembers}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 [.theme-light_&]:border-red-100 [.theme-light_&]:bg-white/80">
                <p className="text-xs uppercase tracking-[0.24em] text-white/40 [.theme-light_&]:text-gray-slate">Current plan</p>
                <p className="mt-2 text-2xl font-semibold text-white [.theme-light_&]:text-orange-dark">{tier.charAt(0).toUpperCase() + tier.slice(1)}</p>
              </div>
            </div>

            {errors.general && (
              <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100 [.theme-light_&]:border-red-200 [.theme-light_&]:bg-red-100 [.theme-light_&]:text-red-700">
                {errors.general}
              </div>
            )}

            <div className="mt-8 flex justify-end gap-3">
              <Button type="button" onClick={handleClose} variant="secondary">
                Cancel
              </Button>
              <Button type="button" onClick={handleUpgradeClick} variant="primary">
                Upgrade Plan
              </Button>
            </div>
          </section>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-[22px] border border-gray-light bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-orange-dark dark:text-[#fff3ea]"
              >
                Email Address *
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@example.com"
                maxLength={254}
                error={errors.email}
                helperText="We’ll email a secure invite link to this address."
                disabled={isLoading}
                className="!border-gray-light !bg-white !text-orange-dark placeholder:!text-gray-slate/50 hover:!border-orange/40 focus:!ring-orange dark:!border-white/10 dark:!bg-[#0f151d] dark:!text-white dark:placeholder:!text-white/25"
              />
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-orange-dark dark:text-[#fff3ea]">Role *</p>
                <span className="text-xs text-gray-slate dark:text-white/45">Choose the permissions they start with.</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {ROLE_OPTIONS.map((option) => {
                  const isSelected = role === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRole(option.value)}
                      className={`rounded-2xl border p-4 text-left transition-all ${
                        isSelected
                          ? 'border-orange/50 bg-orange/10 shadow-[0_0_0_1px_rgba(239,114,21,0.12)] dark:border-orange/70 dark:bg-orange/12'
                          : 'border-gray-light bg-white hover:border-orange/30 hover:bg-orange/5 dark:border-white/10 dark:bg-[#0f151d] dark:hover:border-white/25 dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      <p className={`text-sm font-semibold leading-none ${isSelected ? 'text-orange-dark dark:text-[#fff3ea]' : 'text-orange-dark dark:text-white'}`}>
                        {option.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-gray-slate dark:text-white/60">{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {errors.general && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-100">
                {errors.general}
              </div>
            )}

            <div className="mt-8 flex justify-end gap-3">
              <Button
                type="button"
                onClick={handleClose}
                variant="secondary"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isLoading}
              >
                Send Invite
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
