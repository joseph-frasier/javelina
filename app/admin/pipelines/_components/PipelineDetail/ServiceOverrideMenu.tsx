'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';

export type OverrideTargetState =
  | 'live'
  | 'not_applicable'
  | 'failed'
  | 'needs_input';

interface ServiceOverrideMenuProps {
  onSelect: (state: OverrideTargetState) => void;
  disabled?: boolean;
  /**
   * 'icon' — compact `⋯` overflow button (default)
   * 'inline' — text button "Override status" with a chevron, suited for an
   *   in-card footer row.
   */
  triggerVariant?: 'icon' | 'inline';
  /**
   * 'bottom' — menu opens below the trigger (default)
   * 'top' — menu opens above; use when the trigger sits near the bottom of
   *   an `overflow-hidden` container.
   */
  placement?: 'bottom' | 'top';
  /** Optional label override for the inline trigger. */
  inlineLabel?: string;
}

export function ServiceOverrideMenu({
  onSelect,
  disabled,
  triggerVariant = 'icon',
  placement = 'bottom',
  inlineLabel = 'Override status',
}: ServiceOverrideMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  // Position the portaled menu relative to the trigger.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const compute = () => {
      const t = triggerRef.current?.getBoundingClientRect();
      const m = menuRef.current?.getBoundingClientRect();
      if (!t) return;
      const menuWidth = m?.width ?? 220;
      const menuHeight = m?.height ?? 0;
      const top =
        placement === 'top'
          ? t.top - menuHeight - 4
          : t.bottom + 4;
      const left = t.right - menuWidth; // right-align to trigger
      setCoords({ top, left });
    };
    compute();
    // Re-measure once the menu has actually rendered (so menuHeight is real).
    const raf = requestAnimationFrame(compute);
    return () => cancelAnimationFrame(raf);
  }, [open, placement]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onScrollOrResize = () => setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  const choose = (state: OverrideTargetState) => {
    setOpen(false);
    onSelect(state);
  };

  const ChevronIcon = placement === 'top' ? ChevronUp : ChevronDown;

  const menu =
    open && typeof document !== 'undefined' ? (
      createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed',
            top: coords?.top ?? -9999,
            left: coords?.left ?? -9999,
            visibility: coords ? 'visible' : 'hidden',
          }}
          className="z-[100000] min-w-[200px] rounded-lg border border-border bg-surface shadow-popover py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem onClick={() => choose('live')}>Mark live</MenuItem>
          <MenuItem onClick={() => choose('not_applicable')}>Mark not applicable</MenuItem>
          <div className="my-1 border-t border-border" />
          <MenuItem disabled title="Coming in v1.1">
            <span className="flex items-center justify-between gap-2">
              <span>Mark failed</span>
              <span className="text-[10px] uppercase tracking-wide text-text-faint">v1.1</span>
            </span>
          </MenuItem>
          <MenuItem disabled title="Coming in v1.1">
            <span className="flex items-center justify-between gap-2">
              <span>Mark needs input</span>
              <span className="text-[10px] uppercase tracking-wide text-text-faint">v1.1</span>
            </span>
          </MenuItem>
        </div>,
        document.body
      )
    ) : null;

  return (
    <div ref={ref} className="relative inline-block">
      {triggerVariant === 'icon' ? (
        <button
          ref={triggerRef}
          type="button"
          aria-label="Service override menu"
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className={clsx(
            'flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors',
            'hover:bg-surface-hover hover:text-text focus-visible:outline-none focus-visible:shadow-focus-ring',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors',
            'hover:bg-surface-hover hover:text-text focus-visible:outline-none focus-visible:shadow-focus-ring',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          <span>{inlineLabel}</span>
          <ChevronIcon className="w-3.5 h-3.5" />
        </button>
      )}

      {menu}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        'w-full text-left px-3 py-1.5 text-sm text-text transition-colors',
        disabled
          ? 'text-text-faint cursor-not-allowed'
          : 'hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none'
      )}
    >
      {children}
    </button>
  );
}
