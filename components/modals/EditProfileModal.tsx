'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuthStore } from '@/lib/auth-store';
import { useToastStore } from '@/lib/toast-store';
import { createClient } from '@/lib/supabase/client';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { user, updateProfile } = useAuthStore();
  const { addToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    title: '',
  });

  useEffect(() => {
    if (isOpen && user) {
      // Parse existing name into first/last if possible
      const nameParts = (user.name || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      setFormData({
        first_name: user.first_name || firstName,
        last_name: user.last_name || lastName,
        title: user.title || '',
      });
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name.trim()) {
      addToast('error', 'First name is required');
      return;
    }

    if (!formData.last_name.trim()) {
      addToast('error', 'Last name is required');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      
      // Combine first and last name for the name field (for backward compatibility)
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`;
      
      // Update the user's profile in the profiles table
      const { error } = await supabase
        .from('profiles')
        .update({
          name: fullName,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          title: formData.title.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      // Update the local auth store
      await updateProfile({
        name: fullName,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        title: formData.title.trim() || undefined,
      });

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
      const nameParts = (user.name || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      setFormData({
        first_name: user.first_name || firstName,
        last_name: user.last_name || lastName,
        title: user.title || '',
      });
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Edit Profile" size="medium">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* First Name & Last Name - Side by Side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label 
              htmlFor="first_name" 
              className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
            >
              First Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="first_name"
              type="text"
              placeholder="First name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              disabled={isLoading}
              required
            />
          </div>
          <div>
            <label 
              htmlFor="last_name" 
              className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
            >
              Last Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="last_name"
              type="text"
              placeholder="Last name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        {/* Title Field */}
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
