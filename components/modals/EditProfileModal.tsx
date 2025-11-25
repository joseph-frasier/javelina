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
    billing_email: '',
    billing_phone: '',
    billing_address: '',
    billing_city: '',
    billing_state: '',
    billing_zip: '',
    admin_email: '',
    admin_phone: '',
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
        billing_email: user.billing_email || '',
        billing_phone: user.billing_phone || '',
        billing_address: user.billing_address || '',
        billing_city: user.billing_city || '',
        billing_state: user.billing_state || '',
        billing_zip: user.billing_zip || '',
        admin_email: user.admin_email || '',
        admin_phone: user.admin_phone || '',
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
      // Note: New fields will be added to DB schema later
      const { error } = await supabase
        .from('profiles')
        .update({
          name: fullName,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          title: formData.title.trim() || null,
          billing_email: formData.billing_email.trim() || null,
          billing_phone: formData.billing_phone.trim() || null,
          billing_address: formData.billing_address.trim() || null,
          billing_city: formData.billing_city.trim() || null,
          billing_state: formData.billing_state.trim() || null,
          billing_zip: formData.billing_zip.trim() || null,
          admin_email: formData.admin_email.trim() || null,
          admin_phone: formData.admin_phone.trim() || null,
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
        billing_email: formData.billing_email.trim() || undefined,
        billing_phone: formData.billing_phone.trim() || undefined,
        billing_address: formData.billing_address.trim() || undefined,
        billing_city: formData.billing_city.trim() || undefined,
        billing_state: formData.billing_state.trim() || undefined,
        billing_zip: formData.billing_zip.trim() || undefined,
        admin_email: formData.admin_email.trim() || undefined,
        admin_phone: formData.admin_phone.trim() || undefined,
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
        billing_email: user.billing_email || '',
        billing_phone: user.billing_phone || '',
        billing_address: user.billing_address || '',
        billing_city: user.billing_city || '',
        billing_state: user.billing_state || '',
        billing_zip: user.billing_zip || '',
        admin_email: user.admin_email || '',
        admin_phone: user.admin_phone || '',
      });
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Edit Profile" size="large">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Personal Info */}
        <div>
          <h3 className="text-sm font-semibold text-orange-dark dark:text-orange mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
            Personal Information
          </h3>
          <div className="space-y-4">
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
          </div>
        </div>

        {/* Section 2: Billing Contact */}
        <div>
          <h3 className="text-sm font-semibold text-orange-dark dark:text-orange mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
            Billing Contact
          </h3>
          <div className="space-y-4">
            {/* Billing Email & Phone - Side by Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label 
                  htmlFor="billing_email" 
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
                >
                  Billing Contact Email
                </label>
                <Input
                  id="billing_email"
                  type="email"
                  placeholder="billing@example.com"
                  value={formData.billing_email}
                  onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label 
                  htmlFor="billing_phone" 
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
                >
                  Billing Phone Number
                </label>
                <Input
                  id="billing_phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.billing_phone}
                  onChange={(e) => setFormData({ ...formData, billing_phone: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Billing Address */}
            <div>
              <label 
                htmlFor="billing_address" 
                className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
              >
                Billing Address
              </label>
              <Input
                id="billing_address"
                type="text"
                placeholder="123 Main Street"
                value={formData.billing_address}
                onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                disabled={isLoading}
              />
            </div>

            {/* City, State, Zip - Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="col-span-2">
                <label 
                  htmlFor="billing_city" 
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
                >
                  City
                </label>
                <Input
                  id="billing_city"
                  type="text"
                  placeholder="City"
                  value={formData.billing_city}
                  onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label 
                  htmlFor="billing_state" 
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
                >
                  State
                </label>
                <Input
                  id="billing_state"
                  type="text"
                  placeholder="CA"
                  value={formData.billing_state}
                  onChange={(e) => setFormData({ ...formData, billing_state: e.target.value })}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label 
                  htmlFor="billing_zip" 
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
                >
                  Zip Code
                </label>
                <Input
                  id="billing_zip"
                  type="text"
                  placeholder="90210"
                  value={formData.billing_zip}
                  onChange={(e) => setFormData({ ...formData, billing_zip: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Admin Contact */}
        <div>
          <h3 className="text-sm font-semibold text-orange-dark dark:text-orange mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
            Admin Contact
          </h3>
          <div className="space-y-4">
            {/* Admin Email & Phone - Side by Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label 
                  htmlFor="admin_email" 
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
                >
                  Admin Contact Email
                </label>
                <Input
                  id="admin_email"
                  type="email"
                  placeholder="admin@example.com"
                  value={formData.admin_email}
                  onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label 
                  htmlFor="admin_phone" 
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
                >
                  Admin Phone Number
                </label>
                <Input
                  id="admin_phone"
                  type="tel"
                  placeholder="+1 (555) 987-6543"
                  value={formData.admin_phone}
                  onChange={(e) => setFormData({ ...formData, admin_phone: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
