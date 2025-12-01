'use client';

import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { TagBadge } from '@/components/ui/TagBadge';
import type { Tag, ZoneTagAssignment } from '@/lib/mock-tags-data';
import { getZoneCountForTag } from '@/lib/mock-tags-data';

interface TagsManagerCardProps {
  tags: Tag[];
  assignments: ZoneTagAssignment[];
  activeTagIds: string[];
  onTagClick: (tagId: string) => void;
  onClearFilters: () => void;
  onToggleFavorite: (tagId: string) => void;
  onCreateTag: () => void;
}

export function TagsManagerCard({
  tags,
  assignments,
  activeTagIds,
  onTagClick,
  onClearFilters,
  onToggleFavorite,
  onCreateTag,
}: TagsManagerCardProps) {
  const hasActiveFilters = activeTagIds.length > 0;

  return (
    <Card
      title="Tags"
      description="Organize your zones with tags"
      action={
        <Button variant="primary" size="sm" onClick={onCreateTag}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Tag
        </Button>
      }
    >
      {tags.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 text-gray-slate dark:text-gray-light mx-auto mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <p className="text-gray-slate dark:text-gray-light text-sm mb-4">
            No tags yet. Create your first tag to organize your zones.
          </p>
          <Button variant="primary" size="sm" onClick={onCreateTag}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Tag
          </Button>
        </div>
      ) : (
        <div className="space-y-2 mt-4">
          {/* Active Filter Indicator */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between p-2 bg-orange/10 rounded-lg mb-3">
              <span className="text-sm text-orange-dark dark:text-orange">
                Filtering by {activeTagIds.length} tag{activeTagIds.length > 1 ? 's' : ''}
              </span>
              <button
                onClick={onClearFilters}
                className="text-sm text-orange hover:text-orange-dark flex items-center gap-1"
              >
                Clear
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {tags.map((tag) => {
            const zoneCount = getZoneCountForTag(tag.id, assignments);
            const isActive = activeTagIds.includes(tag.id);

            return (
              <div
                key={tag.id}
                className={`
                  group flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer
                  ${isActive 
                    ? 'bg-orange/10 border border-orange' 
                    : 'bg-gray-light/30 dark:bg-gray-800 border border-transparent hover:bg-gray-light/50 dark:hover:bg-gray-700'
                  }
                `}
                onClick={() => onTagClick(tag.id)}
              >
                <div className="flex items-center gap-3">
                  {/* Checkbox indicator */}
                  <div
                    className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0
                      ${isActive
                        ? 'bg-orange border-orange'
                        : 'border-gray-400 dark:border-gray-500'
                      }
                    `}
                  >
                    {isActive && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <TagBadge name={tag.name} color={tag.color} size="md" />
                  <span className="text-xs text-gray-slate dark:text-gray-400">
                    {zoneCount} {zoneCount === 1 ? 'zone' : 'zones'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
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
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
