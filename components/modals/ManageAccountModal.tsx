'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuthStore } from '@/lib/auth-store';
import { useToastStore } from '@/lib/toast-store';

interface ManageAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Format phone number to (XXX) XXX-XXXX format
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Limit to 10 digits
  const limitedDigits = digits.slice(0, 10);
  
  // Format based on length
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

export function ManageAccountModal({ isOpen, onClose }: ManageAccountModalProps) {
  const { user, updateProfile } = useAuthStore();
  const { addToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
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
      setFormData({
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

  // Email validation helper
  const isValidEmail = (email: string): boolean => {
    if (!email.trim()) return true; // Empty is okay (optional field)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email formats
    if (formData.billing_email && !isValidEmail(formData.billing_email)) {
      addToast('error', 'Please enter a valid billing email address');
      return;
    }

    if (formData.admin_email && !isValidEmail(formData.admin_email)) {
      addToast('error', 'Please enter a valid admin email address');
      return;
    }

    setIsLoading(true);

    try {
      // Update profile via auth store (which routes through Express API)
      const result = await updateProfile({
        billing_email: formData.billing_email.trim() || undefined,
        billing_phone: formData.billing_phone.trim() || undefined,
        billing_address: formData.billing_address.trim() || undefined,
        billing_city: formData.billing_city.trim() || undefined,
        billing_state: formData.billing_state.trim() || undefined,
        billing_zip: formData.billing_zip.trim() || undefined,
        admin_email: formData.admin_email.trim() || undefined,
        admin_phone: formData.admin_phone.trim() || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update account information');
      }

      addToast('success', 'Account information updated successfully');
      onClose();
    } catch (error: any) {
      console.error('Account update error:', error);
      addToast('error', error.message || 'Failed to update account information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
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
    <Modal isOpen={isOpen} onClose={handleCancel} title="Manage Account" size="large">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Billing Contact */}
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
                  placeholder="(555) 123-4567"
                  value={formData.billing_phone}
                  onChange={(e) => setFormData({ ...formData, billing_phone: formatPhoneNumber(e.target.value) })}
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

        {/* Section 2: Admin Contact */}
        <div>
          <h3 className="text-sm font-semibold text-orange-dark dark:text-orange mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
            Admin Contact
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
            The account owner or decision maker for this account
          </p>
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
                  placeholder="(555) 987-6543"
                  value={formData.admin_phone}
                  onChange={(e) => setFormData({ ...formData, admin_phone: formatPhoneNumber(e.target.value) })}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
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

