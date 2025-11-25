'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import { useToastStore } from '@/lib/toast-store';

interface InviteUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
}

type RBACRole = 'SuperAdmin' | 'Admin' | 'Editor' | 'Viewer';

export function InviteUsersModal({
  isOpen,
  onClose,
  organizationId,
  organizationName,
}: InviteUsersModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RBACRole>('Viewer');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ email?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const addToast = useToastStore((state) => state.addToast);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

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
      console.log('Mock invite sent:', {
        organizationId,
        organizationName,
        email,
        role,
        message,
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      addToast('success', `Invite sent to ${email}!`);

      setEmail('');
      setRole('Viewer');
      setMessage('');

      onClose();
    } catch (error: any) {
      console.error('Error sending invite:', error);
      setErrors({ general: error.message || 'Failed to send invite' });
      addToast('error', 'Failed to send invite');
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
            disabled={isLoading}
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
            disabled={isLoading}
            className="w-full px-4 py-2 border border-gray-light dark:border-gray-slate rounded-lg bg-white dark:bg-gray-slate text-gray-slate dark:text-white focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent resize-none"
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
          <Button type="submit" variant="primary" loading={isLoading}>
            Send Invite
          </Button>
        </div>
      </form>
    </Modal>
  );
}
