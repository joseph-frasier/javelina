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
import { apiClient } from '@/lib/api-client';

interface InviteUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  /** Plan code from the organization's subscription */
  planCode?: string;
  /** Callback when invite is successfully sent */
  onSuccess?: () => void;
}

type RBACRole = 'SuperAdmin' | 'Admin' | 'Editor' | 'Viewer';

export function InviteUsersModal({
  isOpen,
  onClose,
  organizationId,
  organizationName,
  planCode,
  onSuccess,
}: InviteUsersModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RBACRole>('Viewer');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ email?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const addToast = useToastStore((state) => state.addToast);
  
  // Plan limits and usage tracking
  const { limits, tier, wouldExceedLimit } = usePlanLimits(planCode);
  const { usage, isLoading: isLoadingUsage, refetch: refetchUsage } = useUsageCounts(organizationId);
  
  // Check if at member limit
  const currentMemberCount = usage?.members ?? 0;
  const isAtMemberLimit = wouldExceedLimit('users', currentMemberCount);

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
      // Call the real API to invite the user
      await apiClient.post(`/organizations/${organizationId}/members/invite`, {
        email,
        role,
        message: message || undefined,
      });

      addToast('success', `Invite sent to ${email}!`);
      
      // Refetch usage counts to update the member count
      await refetchUsage();

      // Reset form
      setEmail('');
      setRole('Viewer');
      setMessage('');

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error: any) {
      console.error('Error sending invite:', error);
      const errorMessage = error?.message || error?.error || 'Failed to send invite';
      
      // Check if it's a limit error from the backend
      if (error?.code === 'LIMIT_EXCEEDED') {
        setErrors({ general: 'Team member limit reached. Please upgrade your plan.' });
      } else {
        setErrors({ general: errorMessage });
      }
      addToast('error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('Viewer');
    setMessage('');
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
            maxCount={limits.users}
            planTier={tier.charAt(0).toUpperCase() + tier.slice(1)}
            isAtLimit={isAtMemberLimit}
            organizationId={organizationId}
          />
        )}
        
        <p className="text-sm text-gray-slate dark:text-gray-light mb-4">
          Invite someone to join {organizationName}
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
            onChange={(value) => setRole(value as RBACRole)}
            options={[
              { value: 'Viewer', label: 'Viewer - Can view only' },
              { value: 'Editor', label: 'Editor - Can view and edit' },
              { value: 'Admin', label: 'Admin - Can manage resources' },
              { value: 'SuperAdmin', label: 'SuperAdmin - Full access' },
            ]}
            disabled={isLoading || isAtMemberLimit}
          />
          <p className="mt-1 text-xs text-gray-slate dark:text-gray-light">
            Select the permission level for this team member
          </p>
        </div>

        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-gray-slate dark:text-white mb-1"
          >
            Message (Optional)
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a personal message to your invitation..."
            rows={3}
            disabled={isLoading || isAtMemberLimit}
            className="w-full px-4 py-2 border border-gray-light dark:border-gray-slate rounded-lg bg-white dark:bg-gray-slate text-gray-slate dark:text-white focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
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
