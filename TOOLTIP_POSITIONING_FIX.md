# Tooltip Positioning Fix - Technical Documentation

## Problem

Tooltips were appearing in incorrect positions on the page, far from their trigger elements (info icons). The issue was particularly noticeable in tables and other containers with horizontal scrolling (`overflow-x-auto`).

### Root Causes

1. **Stacking Context Issues**: Parent containers with `overflow-x-auto` create a new stacking context that can clip or reposition fixed elements
2. **Z-Index Limitations**: Even with very high z-index values (`z-[9999]`), fixed positioning doesn't escape overflow containers
3. **Positioning Calculation Timing**: Tooltips need to be fully rendered before accurate dimensions can be measured

## Solution

### Implementation: React Portal with Fixed Positioning

The solution uses **React Portal** (`createPortal` from `react-dom`) to render tooltips directly at the `document.body` level, completely bypassing any parent container constraints.

### Key Components

#### 1. Portal Rendering
```typescript
import { createPortal } from 'react-dom';

// Render tooltip at document.body level
{mounted && tooltipElement && createPortal(tooltipElement, document.body)}
```

#### 2. Two-Step Rendering Process
```typescript
// Step 1: Render hidden to measure dimensions
const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ 
  visibility: 'hidden' 
});

// Step 2: Calculate position and show
setTooltipStyle({ 
  top: `${top}px`, 
  left: `${left}px`,
  visibility: 'visible',
  opacity: 1
});
```

#### 3. Double RequestAnimationFrame
```typescript
// Wait for tooltip to render, then position it
requestAnimationFrame(() => {
  requestAnimationFrame(updatePosition);
});
```

This ensures the tooltip is fully painted and measurable before positioning calculations.

#### 4. Position Calculation
```typescript
const triggerRect = triggerRef.current.getBoundingClientRect();
const tooltipRect = tooltipRef.current.getBoundingClientRect();

// For 'top' position
top = triggerRect.top - tooltipRect.height - spacing;
left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
```

## Benefits

1. ✅ **No overflow clipping** - Portal renders outside any overflow containers
2. ✅ **No z-index conflicts** - Rendered at body level, above all page content
3. ✅ **Accurate positioning** - Measures actual rendered dimensions before positioning
4. ✅ **Works everywhere** - Tables, cards, nested containers, all work correctly
5. ✅ **SSR compatible** - Uses `mounted` state to only create portal on client

## File Location

`components/ui/Tooltip.tsx`

## Related Issues

- Info icon tooltips in admin tables (Organizations, Users, Audit pages)
- Date hover tooltips
- Status column tooltips

## Testing

To verify the fix works:
1. Navigate to `/admin/users` or `/admin/organizations`
2. Hover over any info icon (ℹ️) next to column headers
3. Tooltip should appear directly above the icon with 8px spacing
4. Test in tables with horizontal scroll
5. Test with browser zoom at different levels

## Alternative Approaches Tried (Did Not Work)

1. ❌ Increasing z-index to `z-[99999]` - Still clipped by overflow containers
2. ❌ Using `absolute` positioning - Positioned relative to parent, not viewport
3. ❌ Single `requestAnimationFrame` - Inconsistent measurement timing
4. ❌ CSS transforms for positioning - Caused misalignment with calculated positions

## Maintenance Notes

- The tooltip uses `fixed` positioning, so it's positioned relative to the viewport
- Scrolling the page will keep tooltips in their calculated positions (they don't follow)
- For scroll-aware tooltips, add scroll event listeners to recalculate position
- The portal cleanup is handled automatically by React when component unmounts

## Credits

Issue identified: October 22, 2025
Solution implemented: React Portal pattern with two-step rendering

