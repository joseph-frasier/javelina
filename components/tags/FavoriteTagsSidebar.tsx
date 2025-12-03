'use client';

import { TagBadge } from '@/components/ui/TagBadge';
import type { Tag } from '@/lib/mock-tags-data';

interface FavoriteTagsSidebarProps {
  tags: Tag[];
  activeTagIds: string[];
  onTagClick: (tagId: string) => void;
  onClearFilters: () => void;
  isCollapsed?: boolean;
}

export function FavoriteTagsSidebar({
  tags,
  activeTagIds,
  onTagClick,
  onClearFilters,
  isCollapsed = false,
}: FavoriteTagsSidebarProps) {
  const favoriteTags = tags.filter(tag => tag.isFavorite);
  const hasActiveFilters = activeTagIds.length > 0;

  if (favoriteTags.length === 0) {
    return null;
  }

  if (isCollapsed) {
    // Collapsed view - just show a star icon with indicator if filters active
    return (
      <div className="px-2 py-1">
        <div 
          className="p-2 rounded-md flex items-center justify-center hover:bg-gray-light dark:hover:bg-gray-700 transition-colors cursor-pointer relative"
          title="Favorite Tags"
        >
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {hasActiveFilters && (
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-orange rounded-full" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 pb-4 border-b border-gray-light dark:border-gray-700">
      {/* Section Header */}
      <div className="flex items-center justify-between px-3 mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <h3 className="text-xs font-semibold text-gray-slate dark:text-gray-400 uppercase tracking-wider">
            Favorite Tags
          </h3>
        </div>
        {hasActiveFilters && (
          <span className="text-xs bg-orange text-white px-1.5 py-0.5 rounded-full">
            {activeTagIds.length}
          </span>
        )}
      </div>

      {/* Favorite Tags List - Max height with scroll */}
      <div className="px-2">
        {/* Clear Filter Option */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-gray-slate hover:text-orange hover:bg-gray-light/50 dark:hover:bg-gray-700 transition-colors mb-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear filters
          </button>
        )}

        <div className="max-h-[160px] overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
          {favoriteTags.map((tag) => {
            const isActive = activeTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => onTagClick(tag.id)}
                className={`
                  w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors
                  ${isActive 
                    ? 'bg-orange/10' 
                    : 'hover:bg-gray-light/50 dark:hover:bg-gray-700'
                  }
                `}
              >
                <TagBadge name={tag.name} color={tag.color} size="sm" />
                {isActive && (
                  <svg className="w-3 h-3 text-orange ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        
        {/* Show count if there are many favorites */}
        {favoriteTags.length > 4 && (
          <p className="text-xs text-gray-slate dark:text-gray-500 mt-2 px-2">
            {favoriteTags.length} favorites
          </p>
        )}
      </div>
    </div>
  );
}
