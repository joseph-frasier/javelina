'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';

interface ManageEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManageEmailModal({ isOpen, onClose }: ManageEmailModalProps) {
  const [currentEmail, setCurrentEmail] = useState('');

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Email address">
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

        {/* Info Text */}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This is the email address associated with your account.
        </p>
      </div>
    </Modal>
  );
}

