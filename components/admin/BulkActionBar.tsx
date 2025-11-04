'use client';

import Button from '@/components/ui/Button';

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDelete?: () => void;
  onSuspend?: () => void;
  onEnable?: () => void;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onDelete,
  onSuspend,
  onEnable
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-orange-dark dark:bg-orange-900 text-white rounded-lg shadow-2xl border border-orange-600 dark:border-orange-800">
        <div className="flex items-center gap-4 px-6 py-4">
          {/* Selection Info */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">
              {selectedCount}
            </div>
            <span className="font-medium">
              {selectedCount === 1 ? '1 item' : `${selectedCount} items`} selected
            </span>
          </div>

          <div className="h-6 w-px bg-white/30"></div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {selectedCount < totalCount && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onSelectAll}
                className="!text-white hover:!bg-white/10"
              >
                Select All ({totalCount})
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={onClearSelection}
              className="!text-white hover:!bg-white/10"
            >
              Clear
            </Button>

            <div className="h-6 w-px bg-white/30 mx-1"></div>

            {onEnable && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onEnable}
                className="!text-white hover:!bg-white/10 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Enable
              </Button>
            )}

            {onSuspend && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onSuspend}
                className="!text-white hover:!bg-white/10 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Suspend
              </Button>
            )}

            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="!text-red-300 hover:!bg-red-500/20 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

