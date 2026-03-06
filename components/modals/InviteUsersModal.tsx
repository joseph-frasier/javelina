'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import { useToastStore } from '@/lib/toast-store';
import { usePlanLimits } from '@/lib/hooks/usePlanLimits';
import { useUsageCounts } from '@/lib/hooks/useUsageCounts';
import { UpgradeLimitBanner } from '@/components/ui/UpgradeLimitBanner';
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

export function InviteUsersModal({
  isOpen,
  onClose,
  organizationId,
  organizationName,
  planCode,
  onSuccess,
}: InviteUsersModalProps) {
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
  const isAtMemberLimit = currentMemberCount >= maxMembers;

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite Team Member"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Plan limit warning/block */}
        {!isLoadingUsage && (
          <UpgradeLimitBanner
            resourceType="members"
            currentCount={currentMemberCount}
            maxCount={maxMembers}
            planTier={tier.charAt(0).toUpperCase() + tier.slice(1)}
            isAtLimit={isAtMemberLimit}
            organizationId={organizationId}
          />
        )}
        
        <p className="text-sm text-gray-slate dark:text-gray-light mb-4">
          Send an invitation to join {organizationName}
        </p>
        
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-slate dark:text-white mb-1"
          >
            Email Address *
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            error={errors.email}
            disabled={isLoading || isAtMemberLimit}
          />
        </div>

        <div>
          <Dropdown
            label="Role *"
            value={role}
            onChange={(value) => setRole(value as MemberAssignableRole)}
            options={[
              { value: 'Viewer', label: 'Viewer - Can view only' },
              { value: 'Editor', label: 'Editor - Can manage DNS' },
              { value: 'BillingContact', label: 'Billing Contact - Can manage billing' },
              { value: 'Admin', label: 'Admin - Can manage resources' },
            ]}
          />
          <p className="mt-1 text-xs text-gray-slate dark:text-gray-light">
            Select the permission level for this team member
          </p>
        </div>

        {errors.general && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-500">{errors.general}</p>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            onClick={handleClose}
            variant="ghost"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            loading={isLoading}
            disabled={isAtMemberLimit}
          >
            Send Invite
          </Button>
        </div>
      </form>
    </Modal>
  );
}
