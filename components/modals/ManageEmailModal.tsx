'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';
import { useToastStore } from '@/lib/toast-store';

interface ManageEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManageEmailModal({ isOpen, onClose }: ManageEmailModalProps) {
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToastStore();

  useEffect(() => {
    if (isOpen) {
      fetchUserEmail();
    }
  }, [isOpen]);

  const fetchUserEmail = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.email) {
        setCurrentEmail(user.email);
      }
    } catch (error) {
      console.error('Error fetching user email:', error);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmail.trim()) {
      addToast('error', 'Please enter a valid email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      addToast('error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      addToast('success', 'Verification email sent. Please check your inbox.');
      setNewEmail('');
      setIsAddingEmail(false);
    } catch (error: any) {
      console.error('Email update error:', error);
      addToast('error', error.message || 'Failed to update email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Email addresses">
      <div className="space-y-4">
        {/* Current Email */}
        <div className="p-4 border border-gray-light dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{currentEmail}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 mt-1">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Verified
              </p>
            </div>
            <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 rounded-full">
              Primary
            </span>
          </div>
        </div>

        {/* Add Email Section */}
        {!isAddingEmail ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingEmail(true)}
            className="w-full"
          >
            + Add email address
          </Button>
        ) : (
          <form onSubmit={handleUpdateEmail} className="space-y-3">
            <Input
              type="email"
              placeholder="New email address"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Add email'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddingEmail(false);
                  setNewEmail('');
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Info Text */}
        <p className="text-sm text-gray-600 dark:text-gray-400 pt-2">
          You&apos;ll receive a verification email at the new address. Once verified, you can set it as your primary email.
        </p>
      </div>
    </Modal>
  );
}

