'use client';

import { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { TagBadge } from '@/components/ui/TagBadge';
import { TAG_COLORS, generateTagId, type Tag } from '@/lib/mock-tags-data';

interface CreateTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTag: (tag: Tag) => void;
  existingTags: Tag[];
}

export function CreateTagModal({ isOpen, onClose, onCreateTag, existingTags }: CreateTagModalProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0].value);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    } else if (existingTags.some(tag => tag.name.toLowerCase() === name.trim().toLowerCase())) {
      newErrors.name = 'A tag with this name already exists';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const newTag: Tag = {
      id: generateTagId(),
      name: name.trim(),
      color: selectedColor,
      isFavorite: false,
    };

    onCreateTag(newTag);
    handleClose();
  };

  const handleClose = () => {
    onClose();
    // Reset form after animation - use ref so we can cancel on unmount
    closeTimeoutRef.current = setTimeout(() => {
      setName('');
      setSelectedColor(TAG_COLORS[0].value);
      setErrors({});
      closeTimeoutRef.current = null;
    }, 250);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Create Tag" 
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
        <div className="flex items-center justify-end space-x-3 pt-2">
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
            Create Tag
          </Button>
        </div>
      </form>
    </Modal>
  );
}

