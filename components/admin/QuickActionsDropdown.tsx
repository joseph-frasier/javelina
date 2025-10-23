'use client';

import { useState } from 'react';

export interface QuickAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  divider?: boolean;
}

interface QuickActionsDropdownProps {
  actions: QuickAction[];
  align?: 'left' | 'right';
}

export function QuickActionsDropdown({ actions, align = 'right' }: QuickActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleActionClick = (action: QuickAction) => {
    setIsOpen(false);
    action.onClick();
  };

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        aria-label="Quick actions"
      >
        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div
            className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden`}
          >
            <div className="py-1">
              {actions.map((action, index) => (
                <div key={index}>
                  {action.divider && index > 0 && (
                    <div className="my-1 border-t border-gray-200 dark:border-gray-700"></div>
                  )}
                  <button
                    onClick={() => handleActionClick(action)}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                      action.variant === 'danger'
                        ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="w-5 h-5 flex-shrink-0">
                      {action.icon}
                    </div>
                    <span className="font-medium">{action.label}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

