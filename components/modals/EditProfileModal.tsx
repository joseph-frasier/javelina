'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuthStore } from '@/lib/auth-store';
import { useToastStore } from '@/lib/toast-store';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Format phone number to (XXX) XXX-XXXX format
const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  const limitedDigits = digits.slice(0, 10);
  
  if (limitedDigits.length === 0) {
    return '';
  } else if (limitedDigits.length <= 3) {
    return `(${limitedDigits}`;
  } else if (limitedDigits.length <= 6) {
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
  } else {
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
  }
};

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { user, updateProfile } = useAuthStore();
  const { addToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    title: '',
    phone: '',
  });

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || '',
        display_name: user.display_name || '',
        title: user.title || '',
        phone: user.phone || '',
      });
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      addToast('error', 'Name is required');
      return;
    }

    setIsLoading(true);

    try {
      // Update profile via auth store (which routes through Express API)
      const result = await updateProfile({
        name: formData.name.trim(),
        display_name: formData.display_name.trim() || undefined,
        title: formData.title.trim() || undefined,
        phone: formData.phone.trim() || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }

      addToast('success', 'Profile updated successfully');
      onClose();
    } catch (error: any) {
      console.error('Profile update error:', error);
      addToast('error', error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || '',
        display_name: user.display_name || '',
        title: user.title || '',
        phone: user.phone || '',
      });
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Edit Profile" size="medium">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label 
            htmlFor="name" 
            className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
          >
            Full Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={isLoading}
            required
          />
        </div>

        {/* Display Name */}
        <div>
          <label 
            htmlFor="display_name" 
            className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
          >
            Display Name
          </label>
          <Input
            id="display_name"
            type="text"
            placeholder="Johnny"
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            disabled={isLoading}
          />
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Optional: A nickname or preferred name
          </p>
        </div>

        {/* Title */}
        <div>
          <label 
            htmlFor="title" 
            className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
          >
            Title
          </label>
          <Input
            id="title"
            type="text"
            placeholder="e.g., Senior DevOps Engineer"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            disabled={isLoading}
          />
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Optional: Your job title or role
          </p>
        </div>

        {/* Phone */}
        <div>
          <label 
            htmlFor="phone" 
            className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
          >
            Phone
          </label>
          <Input
            id="phone"
            type="tel"
            placeholder="(555) 123-4567"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
            disabled={isLoading}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
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
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
