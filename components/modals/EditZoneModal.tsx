'use client';

import { useEffect, useId, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export interface EditZoneFormData {
  name: string;
  description: string;
  admin_email: string;
  negative_caching_ttl: number;
}

interface EditZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoneName: string;
  formData: EditZoneFormData;
  onFormDataChange: (next: EditZoneFormData) => void;
  soaSerial: number | string;
  isSaving: boolean;
  onSave: () => void;
}

export function EditZoneModal({
  isOpen,
  onClose,
  zoneName,
  formData,
  onFormDataChange,
  soaSerial,
  isSaving,
  onSave,
}: EditZoneModalProps) {
  const [isSOAExpanded, setIsSOAExpanded] = useState(false);
  const detailsId = useId();
  const inputFocusClass = 'focus:border-orange focus:ring-2 focus:ring-inset focus:ring-orange focus:ring-offset-0';

  useEffect(() => {
    if (isOpen) {
      setIsSOAExpanded(false);
    }
  }, [isOpen]);

  const updateForm = (next: Partial<EditZoneFormData>) => {
    onFormDataChange({ ...formData, ...next });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Zone: ${zoneName}`}
      size="large"
    >
      <div className="flex max-h-[78vh] flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto">
          <div>
            <label
              htmlFor="edit-zone-name"
              className="mb-2 block text-sm font-medium text-orange-dark dark:text-white"
            >
              Zone Name <span className="text-red-600">*</span>
            </label>
            <Input
              id="edit-zone-name"
              type="text"
              value={formData.name}
              onChange={(e) => updateForm({ name: e.target.value })}
              placeholder="e.g., example.com"
              className={inputFocusClass}
            />
          </div>

          <div>
            <label
              htmlFor="edit-zone-description"
              className="mb-2 block text-sm font-medium text-orange-dark dark:text-white"
            >
              Description
            </label>
            <textarea
              id="edit-zone-description"
              value={formData.description}
              onChange={(e) => updateForm({ description: e.target.value })}
              placeholder="Zone description (optional)"
              rows={3}
              maxLength={500}
              className="w-full rounded-md border border-gray-light bg-white px-3 py-2 text-orange-dark placeholder:text-gray-400 focus:border-orange focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange focus:ring-offset-0 disabled:cursor-not-allowed disabled:bg-gray-light dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-slate">
              {formData.description.length}/500 characters
            </p>
          </div>

          <section className="rounded-lg border border-gray-light/70 bg-transparent p-4 dark:border-gray-slate/70">
            <button
              type="button"
              className="flex w-full items-start justify-between gap-3 text-left"
              aria-expanded={isSOAExpanded}
              aria-controls={detailsId}
              onClick={() => setIsSOAExpanded((prev) => !prev)}
            >
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-orange-dark dark:text-white">SOA Configuration</h3>
                <p className="mt-1 text-xs text-gray-slate">
                  Advanced zone metadata settings.
                </p>
              </div>
              <span className="ml-2 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium text-blue-electric">
                {isSOAExpanded ? 'Hide advanced' : 'Show advanced'}
                <svg
                  className={`h-4 w-4 transition-transform ${isSOAExpanded ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </button>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-blue-electric/40 bg-blue-electric/10 px-2.5 py-1 text-blue-electric">
                Admin: {formData.admin_email || 'Not set'}
              </span>
              <span className="rounded-full border border-blue-electric/40 bg-blue-electric/10 px-2.5 py-1 text-blue-electric">
                Negative TTL: {formData.negative_caching_ttl}s
              </span>
              <span className="rounded-full border border-blue-electric/40 bg-blue-electric/10 px-2.5 py-1 text-blue-electric">
                Serial: {soaSerial}
              </span>
            </div>

            <div
              id={detailsId}
              data-state={isSOAExpanded ? 'open' : 'closed'}
              className={`grid transition-all duration-200 ease-out ${isSOAExpanded ? 'mt-4 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
              <div className="overflow-hidden">
                <div className="space-y-4 pt-4">
                  <div>
                    <label
                      htmlFor="edit-zone-admin-email"
                      className="mb-2 block text-sm font-medium text-orange-dark dark:text-white"
                    >
                      Admin Email
                    </label>
                    <Input
                      id="edit-zone-admin-email"
                      type="email"
                      value={formData.admin_email}
                      onChange={(e) => updateForm({ admin_email: e.target.value })}
                      placeholder="admin@example.com"
                      className={inputFocusClass}
                    />
                    <p className="mt-1 text-xs text-gray-slate">
                      Administrative contact email for this zone.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="edit-zone-negative-ttl"
                      className="mb-2 block text-sm font-medium text-orange-dark dark:text-white"
                    >
                      Negative Caching TTL (seconds)
                    </label>
                    <Input
                      id="edit-zone-negative-ttl"
                      type="number"
                      value={formData.negative_caching_ttl}
                      onChange={(e) => {
                        const parsedValue = Number.parseInt(e.target.value, 10);
                        updateForm({
                          negative_caching_ttl: Number.isNaN(parsedValue) ? 0 : parsedValue,
                        });
                      }}
                      placeholder="3600"
                      min={0}
                      max={86400}
                      className={inputFocusClass}
                    />
                    <p className="mt-1 text-xs text-gray-slate">
                      How long to cache negative DNS responses (0-86400 seconds).
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="edit-zone-soa-serial"
                      className="mb-2 block text-sm font-medium text-orange-dark dark:text-white"
                    >
                      SOA Serial <span className="text-gray-400">(read-only)</span>
                    </label>
                    <Input
                      id="edit-zone-soa-serial"
                      type="text"
                      value={soaSerial}
                      disabled
                      className={`${inputFocusClass} bg-gray-100 dark:bg-gray-700`}
                    />
                    <p className="mt-1 text-xs text-gray-slate">
                      Auto-increments on any zone or record change.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-5 pt-1">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isSaving} className="h-10">
              Cancel
            </Button>
            <Button variant="primary" onClick={onSave} disabled={isSaving} className="h-10">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default EditZoneModal;
