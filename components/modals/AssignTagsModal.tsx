'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { TagBadge } from '@/components/ui/TagBadge';
import type { Tag } from '@/lib/mock-tags-data';

interface AssignTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoneName: string;
  zoneId: string;
  allTags: Tag[];
  assignedTagIds: string[];
  onSave: (zoneId: string, tagIds: string[]) => void;
  onToggleFavorite: (tagId: string) => void;
}

export function AssignTagsModal({
  isOpen,
  onClose,
  zoneName,
  zoneId,
  allTags,
  assignedTagIds,
  onSave,
  onToggleFavorite,
}: AssignTagsModalProps) {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const prevIsOpenRef = useRef(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount to prevent setting state on unmounted component
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Reset selected tags only when modal OPENS (not on every assignedTagIds change)
  // This prevents losing user selections when parent state changes mid-edit
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;
    
    // Only reset when modal transitions from closed to open
    if (isOpen && !wasOpen) {
      setSelectedTagIds([...assignedTagIds]);
      setSearchQuery('');
    }
  }, [isOpen, assignedTagIds]);

  const filteredTags = allTags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSave = () => {
    onSave(zoneId, selectedTagIds);
    handleClose();
  };

  const handleClose = () => {
    onClose();
    // Reset after animation - use ref so we can cancel on unmount
    closeTimeoutRef.current = setTimeout(() => {
      setSearchQuery('');
      closeTimeoutRef.current = null;
    }, 250);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={`Manage Tags for ${zoneName}`}
      size="medium"
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <input
            type="search"
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 rounded-md border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange transition-colors"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Tags List */}
        <div className="min-h-[256px] max-h-64 overflow-y-auto space-y-1">
          {filteredTags.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-slate dark:text-gray-400 text-sm">
                {searchQuery ? 'No tags match your search' : 'No tags available'}
              </p>
            </div>
          ) : (
            filteredTags.map((tag) => (
              <div
                key={tag.id}
                className={`
                  flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors
                  ${selectedTagIds.includes(tag.id)
                    ? 'bg-orange/10 border border-orange'
                    : 'bg-gray-light/30 dark:bg-gray-800 border border-transparent hover:bg-gray-light/50 dark:hover:bg-gray-700'
                  }
                `}
                onClick={() => toggleTag(tag.id)}
              >
                <div className="flex items-center gap-3">
                  {/* Checkbox */}
                  <div
                    className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                      ${selectedTagIds.includes(tag.id)
                        ? 'bg-orange border-orange'
                        : 'border-gray-slate dark:border-gray-500'
                      }
                    `}
                  >
                    {selectedTagIds.includes(tag.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  
                  {/* Tag Badge */}
                  <TagBadge name={tag.name} color={tag.color} size="sm" />
                </div>

                {/* Favorite Star */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(tag.id);
                  }}
                  className="p-1 rounded hover:bg-gray-light dark:hover:bg-gray-600 transition-colors"
                  title={tag.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {tag.isFavorite ? (
                    <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Selected Tags Preview */}
        {selectedTagIds.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-gray-slate dark:text-gray-400 mb-2">
              Selected tags ({selectedTagIds.length}):
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedTagIds.map(tagId => {
                const tag = allTags.find(t => t.id === tagId);
                if (!tag) return null;
                return (
                  <TagBadge
                    key={tag.id}
                    name={tag.name}
                    color={tag.color}
                    size="sm"
                    showRemove
                    onRemove={() => toggleTag(tag.id)}
                  />
                );
              })}
            </div>
          </div>
        )}

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
            type="button"
            variant="primary"
            onClick={handleSave}
          >
            Save Tags
          </Button>
        </div>
      </div>
    </Modal>
  );
}
