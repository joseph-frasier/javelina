'use client';

import { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { TagBadge } from '@/components/ui/TagBadge';
import { TAG_COLORS } from '@/lib/mock-tags-data';
import { type Tag } from '@/lib/api-client';

interface CreateTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTag: (tag: { name: string; color: string }) => void;
  existingTags: Tag[];
  // Edit mode props
  tagToEdit?: Tag | null;
  onEditTag?: (tag: Tag) => void;
  onDeleteTag?: (tagId: string) => void;
  // For showing usage counts in delete confirmation
  zoneCount?: number;
  recordCount?: number;
}

export function CreateTagModal({ 
  isOpen, 
  onClose, 
  onCreateTag, 
  existingTags,
  tagToEdit,
  onEditTag,
  onDeleteTag,
  zoneCount = 0,
  recordCount = 0,
}: CreateTagModalProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0].value);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isEditMode = !!tagToEdit;

  // Populate form when editing
  useEffect(() => {
    if (tagToEdit && isOpen) {
      setName(tagToEdit.name);
      setSelectedColor(tagToEdit.color);
      setShowDeleteConfirm(false);
      setErrors({});
    } else if (!isOpen) {
      // Reset when modal closes
      setShowDeleteConfirm(false);
    }
  }, [tagToEdit, isOpen]);

  // Cleanup timeout on unmount to prevent setting state on unmounted component
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const validateForm = (): boolean => {
    const newErrors: { name?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Tag name is required';
    } else if (name.length > 30) {
      newErrors.name = 'Tag name must be 30 characters or less';
    } else {
      // Check for duplicate name, excluding current tag when editing
      const isDuplicate = existingTags.some(tag => {
        const isSameTag = isEditMode && tagToEdit && tag.id === tagToEdit.id;
        return !isSameTag && tag.name.toLowerCase() === name.trim().toLowerCase();
      });
      if (isDuplicate) {
        newErrors.name = 'A tag with this name already exists';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (isEditMode && tagToEdit && onEditTag) {
      // Edit existing tag
      const updatedTag: Tag = {
        ...tagToEdit,
        name: name.trim(),
        color: selectedColor,
      };
      onEditTag(updatedTag);
    } else {
      // Create new tag
      const newTag = {
        name: name.trim(),
        color: selectedColor,
      };
      onCreateTag(newTag);
    }
    handleClose();
  };

  const handleDelete = () => {
    if (tagToEdit && onDeleteTag) {
      onDeleteTag(tagToEdit.id);
      handleClose();
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form after animation - use ref so we can cancel on unmount
    closeTimeoutRef.current = setTimeout(() => {
      setName('');
      setSelectedColor(TAG_COLORS[0].value);
      setErrors({});
      setShowDeleteConfirm(false);
      closeTimeoutRef.current = null;
    }, 250);
  };

  // Delete confirmation view
  if (showDeleteConfirm && tagToEdit) {
    return (
      <Modal 
        isOpen={isOpen} 
        onClose={handleClose} 
        title="Delete Tag" 
        size="small"
      >
        <div className="space-y-5">
          {/* Warning Icon and Message */}
          <div className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Are you sure you want to delete
            </p>
            <div className="flex justify-center mb-4">
              <TagBadge name={tagToEdit.name} color={tagToEdit.color} size="md" />
            </div>
            {(zoneCount > 0 || recordCount > 0) && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This will remove the tag from{' '}
                {zoneCount > 0 && (
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {zoneCount} zone{zoneCount !== 1 ? 's' : ''}
                  </span>
                )}
                {zoneCount > 0 && recordCount > 0 && ' and '}
                {recordCount > 0 && (
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {recordCount} record{recordCount !== 1 ? 's' : ''}
                  </span>
                )}
                .
              </p>
            )}
            {zoneCount === 0 && recordCount === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This tag is not currently assigned to any zones or records.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
            >
              Delete Tag
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={isEditMode ? "Edit Tag" : "Create Tag"}
      size="small"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Tag Name Input */}
        <div>
          <label htmlFor="tag-name" className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
            Tag Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="tag-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Production, US-East"
            className={errors.name ? 'border-red-500' : ''}
            maxLength={30}
            autoFocus
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
          <p className="mt-1 text-xs text-gray-slate">
            {name.length}/30 characters
          </p>
        </div>

        {/* Color Palette */}
        <div>
          <label className="block text-sm font-medium text-orange-dark dark:text-white mb-3">
            Tag Color
          </label>
          <div className="grid grid-cols-8 gap-2">
            {TAG_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setSelectedColor(color.value)}
                className={`
                  w-8 h-8 rounded-md transition-all duration-150
                  ${selectedColor === color.value 
                    ? 'ring-2 ring-offset-2 ring-orange scale-110' 
                    : 'hover:scale-110'
                  }
                `}
                style={{ backgroundColor: color.value }}
                title={color.name}
                aria-label={`Select ${color.name} color`}
              />
            ))}
          </div>
        </div>

        {/* Preview */}
        <div>
          <label className="block text-sm font-medium text-orange-dark dark:text-white mb-2">
            Preview
          </label>
          <div className="p-4 bg-gray-light/30 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            {name.trim() ? (
              <TagBadge name={name.trim()} color={selectedColor} size="md" />
            ) : (
              <span className="text-sm text-gray-slate italic">Enter a tag name to see preview</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={`flex items-center pt-2 ${isEditMode ? 'justify-between' : 'justify-end'}`}>
          {/* Delete button - only in edit mode */}
          {isEditMode && onDeleteTag && (
            <Button
              type="button"
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </Button>
          )}
          
          <div className="flex items-center space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!name.trim()}
            >
              {isEditMode ? 'Save Changes' : 'Create Tag'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
