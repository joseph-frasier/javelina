'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { useToastStore } from '@/lib/toast-store';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToastStore();

  const handleSendResetEmail = async () => {
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        addToast('error', 'No email found for password reset');
        return;
      }

      // Use auth callback route which will handle the code exchange and redirect to reset-password
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });

      if (error) throw error;

      addToast('success', 'Password reset email sent. Check your inbox.');
      onClose();
    } catch (error: any) {
      console.error('Password reset error:', error);
      addToast('error', error.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Password">
      <div className="space-y-6">
        {/* Explanation Text */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Secure Password Reset
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                For your security, password changes are handled through a secure email link. 
                We&apos;ll send a password reset email to your registered email address.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSendResetEmail}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Reset Email'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

