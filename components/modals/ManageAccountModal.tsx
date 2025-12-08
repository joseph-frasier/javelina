'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import { useAuthStore } from '@/lib/auth-store';
import { useToastStore } from '@/lib/toast-store';

interface ManageAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Common timezones
const timezoneOptions = [
  { value: '', label: 'Select timezone...' },
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'America/Phoenix', label: 'Arizona Time' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'UTC', label: 'UTC' },
];

// Language options
const languageOptions = [
  { value: '', label: 'Select language...' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
];

export function ManageAccountModal({ isOpen, onClose }: ManageAccountModalProps) {
  const { user, updateProfile } = useAuthStore();
  const { addToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    timezone: '',
    language: '',
    bio: '',
  });

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        timezone: user.timezone || '',
        language: user.language || '',
        bio: user.bio || '',
      });
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Update profile via auth store (which routes through Express API)
      const result = await updateProfile({
        timezone: formData.timezone || undefined,
        language: formData.language || undefined,
        bio: formData.bio.trim() || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update account settings');
      }

      addToast('success', 'Account settings updated successfully');
      onClose();
    } catch (error: any) {
      console.error('Account update error:', error);
      addToast('error', error.message || 'Failed to update account settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        timezone: user.timezone || '',
        language: user.language || '',
        bio: user.bio || '',
      });
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Account Settings" size="medium">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Timezone */}
        <div>
          <Dropdown
            label="Timezone"
            value={formData.timezone}
            onChange={(value) => setFormData({ ...formData, timezone: value })}
            options={timezoneOptions}
          />
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Used for displaying dates and times
          </p>
        </div>

        {/* Language */}
        <div>
          <Dropdown
            label="Language"
            value={formData.language}
            onChange={(value) => setFormData({ ...formData, language: value })}
            options={languageOptions}
          />
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Preferred language for the interface
          </p>
        </div>

        {/* Bio */}
        <div>
          <label 
            htmlFor="bio" 
            className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
          >
            Bio
          </label>
          <textarea
            id="bio"
            rows={3}
            placeholder="Tell us a bit about yourself..."
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            disabled={isLoading}
            className="w-full px-3 py-2 rounded-md border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none"
            maxLength={500}
          />
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {formData.bio.length}/500 characters
          </p>
        </div>

        {/* Billing Notice */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-gray-100">Billing Information</span>
            <br />
            Billing details are managed through your subscription settings. 
            Visit the billing page for your organization to update payment information.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
