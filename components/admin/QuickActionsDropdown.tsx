'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

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
  const [mounted, setMounted] = useState(false);
  // Hidden until measured so the menu never paints at the wrong spot for a frame.
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Position the menu with fixed coordinates derived from the trigger's viewport
  // rect. The menu is portaled to <body>, so it escapes the admin table's
  // overflow-x-auto/overflow-hidden ancestors that otherwise clip an absolutely
  // positioned menu when a row sits near the bottom of the list.
  const position = useCallback(() => {
    if (!buttonRef.current || !dropdownRef.current) return;
    const buttonRect = buttonRef.current.getBoundingClientRect();
    const menuRect = dropdownRef.current.getBoundingClientRect();
    const spacing = 8;

    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    // Flip upward only when there isn't room below but there is above.
    const openUpward =
      spaceBelow < menuRect.height + spacing + 12 && spaceAbove > menuRect.height + spacing + 12;

    const top = openUpward
      ? buttonRect.top - menuRect.height - spacing
      : buttonRect.bottom + spacing;
    const left = align === 'right' ? buttonRect.right - menuRect.width : buttonRect.left;

    setMenuStyle({
      position: 'fixed',
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      visibility: 'visible',
    });
  }, [align]);

  useEffect(() => {
    if (!isOpen) {
      setMenuStyle({ visibility: 'hidden' });
      return;
    }
    // Measure after the menu has painted, then keep it pinned to the trigger.
    requestAnimationFrame(() => requestAnimationFrame(position));
    // The menu is fixed-positioned, so any scroll (including the table's inner
    // scroll container — hence capture) or resize would detach it. Close instead
    // of trying to chase the moving trigger.
    const close = () => setIsOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [isOpen, position]);

  const handleActionClick = (action: QuickAction) => {
    setIsOpen(false);
    action.onClick();
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
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

      {isOpen &&
        mounted &&
        createPortal(
          <>
            {/* Backdrop: click-outside to close */}
            <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />

            {/* Dropdown Menu */}
            <div
              ref={dropdownRef}
              style={menuStyle}
              className="w-56 bg-surface rounded-lg shadow-lg border border-border z-[9999] overflow-hidden"
            >
              <div className="py-1">
                {actions.map((action, index) => (
                  <div key={index}>
                    {action.divider && index > 0 && (
                      <div className="my-1 border-t border-border"></div>
                    )}
                    <button
                      onClick={() => handleActionClick(action)}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                        action.variant === 'danger'
                          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-surface-hover'
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
          </>,
          document.body
        )}
    </div>
  );
}
