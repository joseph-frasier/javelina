# Business Intake Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 5-step post-checkout intake wizard for Javelina Business Starter/Pro plans at `/business/setup`, plus a minimal placeholder dashboard at `/business/[orgId]`, all styled from the `.jbp_mockup` design system (mockup tokens + Javelina orange accent). Mock-data only: no backend writes, no real provisioning. DNS plan flow stays untouched.

**Architecture:** Business plans thread a query param (`intake=business`) from `/pricing` → `/checkout` → Stripe `return_url` → `/stripe/success`, which reads the param and redirects to `/business/setup?org_id=X&plan_code=Y` instead of the default `/organization/X`. Wizard state lives in a Zustand `persist` store keyed by `orgId`. New design system lives in `components/business/ui/` and is scoped to `/business/*` via `app/business/layout.tsx` — the rest of the app keeps its current styling.

**Tech Stack:** Next.js 15 App Router (client components), React 19, Zustand 5 + persist middleware, Tailwind CSS (existing), Vitest + React Testing Library (existing), inline-style theming via a token object (mockup pattern).

---

## Conventions used throughout this plan

- All new files use `'use client'` unless noted.
- Styling mirrors the mockup's approach: a **token object** (`t`) passed as a prop to primitives, inline `style={{ ... }}` blocks. This is intentional — it keeps tokens explicit, makes dark-mode work later a prop flip, and avoids touching Tailwind config. Tailwind is still used for layout utilities where natural (`flex`, `grid`, `min-h-screen`), but colors/radii/shadows come from the token object.
- Every component file exports **both** a default component (for app use) and a named export (for tests). Tests import the named export.
- Tests live beside source under `tests/business/**` mirroring the `components/business/**` structure.
- Commit cadence: one commit per task. Commit messages use `feat(business):`, `test(business):`, `chore(business):` prefixes.

---

## Task 1: Scaffold directories + create design tokens

**Files:**
- Create: `components/business/ui/tokens.ts`
- Create: `tests/business/ui/tokens.test.ts`

- [ ] **Step 1: Write the failing test**

File: `tests/business/ui/tokens.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { lightTokens, type Tokens } from '@/components/business/ui/tokens';

describe('business design tokens', () => {
  it('uses Javelina orange as the accent color', () => {
    expect(lightTokens.accent).toBe('#EF7215');
  });

  it('exposes every token role referenced by the mockup primitives', () => {
    const keys: (keyof Tokens)[] = [
      'bg', 'surface', 'surfaceAlt', 'surfaceHover',
      'border', 'borderStrong',
      'text', 'textMuted', 'textFaint',
      'accent', 'accentHover', 'accentSoft', 'accentSoftStrong', 'ring',
      'success', 'warning', 'danger',
      'shadowSm', 'shadowMd', 'shadowLg',
    ];
    for (const k of keys) {
      expect(lightTokens[k], `missing token: ${k}`).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run test — expect fail**

Run: `npx vitest run tests/business/ui/tokens.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement tokens**

File: `components/business/ui/tokens.ts`

```ts
export interface Tokens {
  bg: string;
  surface: string;
  surfaceAlt: string;
  surfaceHover: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  accentSoftStrong: string;
  ring: string;
  success: string;
  warning: string;
  danger: string;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
}

export const FONT =
  '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, system-ui, sans-serif';
export const MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

// Javelina orange accent scale — mockup's accent role, Javelina brand hex
const ACCENT = {
  500: '#EF7215',
  600: '#D46410',
  50: '#FEF0E5',
  100: '#FDE2CC',
  ring: 'rgba(239,114,21,0.18)',
};

export const lightTokens: Tokens = {
  bg: '#f7f8fa',
  surface: '#ffffff',
  surfaceAlt: '#fafbfc',
  surfaceHover: '#f4f5f7',
  border: '#e6e8ec',
  borderStrong: '#d3d7de',
  text: '#0f1419',
  textMuted: '#566271',
  textFaint: '#8a94a3',
  accent: ACCENT[500],
  accentHover: ACCENT[600],
  accentSoft: ACCENT[50],
  accentSoftStrong: ACCENT[100],
  ring: ACCENT.ring,
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  shadowSm: '0 1px 2px rgba(15,20,25,0.04), 0 1px 2px rgba(15,20,25,0.06)',
  shadowMd: '0 4px 12px rgba(15,20,25,0.06), 0 12px 32px rgba(15,20,25,0.06)',
  shadowLg: '0 24px 60px rgba(15,20,25,0.12), 0 2px 8px rgba(15,20,25,0.06)',
};

// Exported as default so wizard/dashboard components can import one symbol.
export const t: Tokens = lightTokens;
```

- [ ] **Step 4: Run test — expect pass**

Run: `npx vitest run tests/business/ui/tokens.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/business/ui/tokens.ts tests/business/ui/tokens.test.ts
git commit -m "feat(business): add design tokens for business intake UI"
```

---

## Task 2: Icon primitive

**Files:**
- Create: `components/business/ui/Icon.tsx`
- Create: `tests/business/ui/Icon.test.tsx`

- [ ] **Step 1: Write the failing test**

File: `tests/business/ui/Icon.test.tsx`

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Icon } from '@/components/business/ui/Icon';

describe('Icon', () => {
  it('renders the named SVG shape', () => {
    const { container } = render(<Icon name="check" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('width')).toBe('16');
  });

  it('falls back silently for unknown names', () => {
    const { container } = render(<Icon name={'nope' as never} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test — expect fail**

Run: `npx vitest run tests/business/ui/Icon.test.tsx` → FAIL, not found.

- [ ] **Step 3: Implement**

File: `components/business/ui/Icon.tsx`

```tsx
'use client';
import type { CSSProperties } from 'react';

export type IconName =
  | 'check' | 'arrowRight' | 'arrowLeft' | 'plus' | 'external'
  | 'globe' | 'server' | 'shield' | 'chart' | 'credit' | 'edit'
  | 'dots' | 'search' | 'copy' | 'bell' | 'sparkle' | 'x'
  | 'info' | 'lock' | 'rocket' | 'refresh' | 'activity' | 'users';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: CSSProperties;
}

// Stroke icons — viewBox 16, strokeWidth 1.5. Shapes lifted from the mockup.
const PATHS: Record<IconName, JSX.Element> = {
  check: <polyline points="3,8 7,12 13,4" />,
  arrowRight: (
    <g><line x1="3" y1="8" x2="13" y2="8" /><polyline points="9,4 13,8 9,12" /></g>
  ),
  arrowLeft: (
    <g><line x1="3" y1="8" x2="13" y2="8" /><polyline points="7,4 3,8 7,12" /></g>
  ),
  plus: (
    <g><line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" /></g>
  ),
  external: (
    <g><polyline points="10,3 13,3 13,6" /><line x1="13" y1="3" x2="8" y2="8" /><path d="M11 9v3H3V4h3" /></g>
  ),
  globe: (
    <g><circle cx="8" cy="8" r="5.5" /><line x1="2.5" y1="8" x2="13.5" y2="8" /><path d="M8 2.5c1.7 2 1.7 9 0 11M8 2.5c-1.7 2 -1.7 9 0 11" /></g>
  ),
  server: (
    <g><rect x="2.5" y="3" width="11" height="4" rx="1" /><rect x="2.5" y="9" width="11" height="4" rx="1" /></g>
  ),
  shield: <path d="M8 2L3 4v4c0 3 2.5 5 5 6c2.5-1 5-3 5-6V4L8 2Z" />,
  chart: (
    <g><polyline points="2,12 6,8 9,10 14,4" /><line x1="2" y1="13.5" x2="14" y2="13.5" /></g>
  ),
  credit: (
    <g><rect x="2" y="4" width="12" height="9" rx="1.5" /><line x1="2" y1="7" x2="14" y2="7" /></g>
  ),
  edit: <g><path d="M11 3l2 2l-8 8H3v-2z" /></g>,
  dots: (
    <g>
      <circle cx="4" cy="8" r="0.8" />
      <circle cx="8" cy="8" r="0.8" />
      <circle cx="12" cy="8" r="0.8" />
    </g>
  ),
  search: (
    <g><circle cx="7" cy="7" r="4" /><line x1="10" y1="10" x2="13.5" y2="13.5" /></g>
  ),
  copy: (
    <g><rect x="5" y="5" width="8" height="8" rx="1.5" /><path d="M3 11V4a1 1 0 011-1h7" /></g>
  ),
  bell: (
    <g><path d="M4 11V7a4 4 0 018 0v4l1 1H3z" /><path d="M7 13.5a1.5 1.5 0 003 0" /></g>
  ),
  sparkle: (
    <g><path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2" /></g>
  ),
  x: (
    <g><line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" /></g>
  ),
  info: (
    <g>
      <circle cx="8" cy="8" r="6" />
      <line x1="8" y1="7" x2="8" y2="11" />
      <circle cx="8" cy="5" r="0.5" />
    </g>
  ),
  lock: (
    <g><rect x="4" y="7" width="8" height="6" rx="1" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" /></g>
  ),
  rocket: (
    <g><path d="M9 3c3 0 4 1 4 4c0 0-2 1-2 3l-2 2l-3-3l2-2c2 0 3-2 3-2zM6 10l-2 2l1 1l2-2" /></g>
  ),
  refresh: (
    <g><path d="M3 8a5 5 0 018.5-3.5L13 6M13 3v3h-3" /><path d="M13 8a5 5 0 01-8.5 3.5L3 10M3 13v-3h3" /></g>
  ),
  activity: <polyline points="2,8 5,8 7,3 10,13 12,8 14,8" />,
  users: (
    <g>
      <circle cx="6" cy="6" r="2.5" />
      <path d="M2 13c0-2 2-3.5 4-3.5s4 1.5 4 3.5" />
      <circle cx="11" cy="6" r="2" />
      <path d="M10 9.5c2 0 4 1 4 3" />
    </g>
  ),
};

export function Icon({ name, size = 16, color = 'currentColor', style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
    >
      {PATHS[name] ?? null}
    </svg>
  );
}

export default Icon;
```

- [ ] **Step 4: Run test — expect pass**

Run: `npx vitest run tests/business/ui/Icon.test.tsx` → PASS.

- [ ] **Step 5: Commit**

```bash
git add components/business/ui/Icon.tsx tests/business/ui/Icon.test.tsx
git commit -m "feat(business): add Icon primitive"
```

---

## Task 3: Button primitive

**Files:**
- Create: `components/business/ui/Button.tsx`
- Create: `tests/business/ui/Button.test.tsx`

- [ ] **Step 1: Test**

```tsx
// tests/business/ui/Button.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/business/ui/Button';
import { t } from '@/components/business/ui/tokens';

describe('Button', () => {
  it('calls onClick when enabled', () => {
    const onClick = vi.fn();
    render(<Button t={t} onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<Button t={t} onClick={onClick} disabled>Go</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders ghost and link variants without shadow on link', () => {
    const { rerender } = render(<Button t={t} variant="link">Link</Button>);
    expect(screen.getByRole('button')).toBeTruthy();
    rerender(<Button t={t} variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Expect fail**

Run: `npx vitest run tests/business/ui/Button.test.tsx` → FAIL.

- [ ] **Step 3: Implement**

```tsx
// components/business/ui/Button.tsx
'use client';
import type { CSSProperties, ReactNode } from 'react';
import { FONT, type Tokens } from './tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'link';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  t: Tokens;
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  type?: 'button' | 'submit';
}

const SIZES: Record<Size, { h: number; px: number; fs: number }> = {
  sm: { h: 30, px: 12, fs: 13 },
  md: { h: 38, px: 16, fs: 14 },
  lg: { h: 44, px: 20, fs: 15 },
};

export function Button({
  t, variant = 'primary', size = 'md',
  children, onClick, disabled, style,
  iconLeft, iconRight, type = 'button',
}: ButtonProps) {
  const s = SIZES[size];
  const variantStyle: CSSProperties =
    variant === 'primary'
      ? {
          background: disabled ? t.borderStrong : t.accent,
          color: '#fff',
          border: '1px solid transparent',
          boxShadow: disabled
            ? 'none'
            : '0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.15)',
        }
      : variant === 'secondary'
      ? { background: t.surface, color: t.text, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }
      : variant === 'ghost'
      ? { background: 'transparent', color: t.text, border: '1px solid transparent' }
      : { background: 'transparent', color: t.accent, border: 'none', padding: 0, height: 'auto' };

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        height: variant === 'link' ? 'auto' : s.h,
        padding: variant === 'link' ? 0 : `0 ${s.px}px`,
        fontSize: s.fs,
        fontWeight: 550,
        fontFamily: FONT,
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        whiteSpace: 'nowrap',
        transition: 'background .12s, box-shadow .12s, transform .05s',
        letterSpacing: -0.1,
        ...variantStyle,
        ...style,
      }}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}

export default Button;
```

- [ ] **Step 4: Run test — expect pass**

Run: `npx vitest run tests/business/ui/Button.test.tsx` → PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/business/ui/Button.tsx tests/business/ui/Button.test.tsx
git commit -m "feat(business): add Button primitive"
```

---

## Task 4: Input primitive

**Files:**
- Create: `components/business/ui/Input.tsx`
- Create: `tests/business/ui/Input.test.tsx`

- [ ] **Step 1: Test**

```tsx
// tests/business/ui/Input.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '@/components/business/ui/Input';
import { t } from '@/components/business/ui/tokens';

describe('Input', () => {
  it('calls onChange with the new value', () => {
    const onChange = vi.fn();
    render(<Input t={t} value="" onChange={onChange} placeholder="name" />);
    fireEvent.change(screen.getByPlaceholderText('name'), { target: { value: 'hi' } });
    expect(onChange).toHaveBeenCalledWith('hi');
  });

  it('renders prefix and suffix slots', () => {
    render(
      <Input t={t} value="" onChange={() => {}} prefix={<span>PRE</span>} suffix={<span>SUF</span>} />,
    );
    expect(screen.getByText('PRE')).toBeTruthy();
    expect(screen.getByText('SUF')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Expect fail**

Run: `npx vitest run tests/business/ui/Input.test.tsx` → FAIL.

- [ ] **Step 3: Implement**

```tsx
// components/business/ui/Input.tsx
'use client';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { FONT, type Tokens } from './tokens';

interface InputProps {
  t: Tokens;
  value: string | number | undefined;
  onChange?: (v: string) => void;
  placeholder?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  style?: CSSProperties;
  type?: 'text' | 'email' | 'tel';
  readOnly?: boolean;
}

export function Input({ t, value, onChange, placeholder, prefix, suffix, style, type = 'text', readOnly }: InputProps) {
  const [focus, setFocus] = useState(false);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        height: 40,
        borderRadius: 8,
        background: readOnly ? t.surfaceAlt : t.surface,
        border: `1px solid ${focus ? t.accent : t.border}`,
        boxShadow: focus ? `0 0 0 3px ${t.ring}` : t.shadowSm,
        transition: 'border-color .12s, box-shadow .12s',
        fontFamily: FONT,
        overflow: 'hidden',
        ...style,
      }}
    >
      {prefix != null && (
        <div
          style={{
            display: 'flex', alignItems: 'center',
            padding: '0 10px 0 12px',
            color: t.textMuted, fontSize: 13,
            borderRight: `1px solid ${t.border}`,
            background: t.surfaceAlt,
          }}
        >
          {prefix}
        </div>
      )}
      <input
        type={type}
        value={value ?? ''}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={placeholder}
        style={{
          flex: 1, border: 'none', outline: 'none',
          padding: '0 12px',
          background: 'transparent', color: t.text,
          fontSize: 14, fontFamily: FONT,
        }}
      />
      {suffix != null && (
        <div
          style={{
            display: 'flex', alignItems: 'center',
            padding: '0 12px',
            color: t.textMuted, fontSize: 13,
            borderLeft: `1px solid ${t.border}`,
            background: t.surfaceAlt,
          }}
        >
          {suffix}
        </div>
      )}
    </div>
  );
}

export default Input;
```

- [ ] **Step 4: Run test — expect pass**

Run: `npx vitest run tests/business/ui/Input.test.tsx` → PASS.

- [ ] **Step 5: Commit**

```bash
git add components/business/ui/Input.tsx tests/business/ui/Input.test.tsx
git commit -m "feat(business): add Input primitive"
```

---

## Task 5: Card, Badge, StepHeader, FieldLabel primitives (batched)

These are tiny, stateless wrappers. One file each, one test each.

**Files:**
- Create: `components/business/ui/Card.tsx`, `Badge.tsx`, `StepHeader.tsx`, `FieldLabel.tsx`
- Create: `tests/business/ui/static-primitives.test.tsx`

- [ ] **Step 1: Write the failing test**

File: `tests/business/ui/static-primitives.test.tsx`

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { t } from '@/components/business/ui/tokens';
import { Card } from '@/components/business/ui/Card';
import { Badge } from '@/components/business/ui/Badge';
import { StepHeader } from '@/components/business/ui/StepHeader';
import { FieldLabel } from '@/components/business/ui/FieldLabel';

describe('Card', () => {
  it('renders children', () => {
    render(<Card t={t}><span>inside</span></Card>);
    expect(screen.getByText('inside')).toBeTruthy();
  });
});

describe('Badge', () => {
  it('renders label and a dot when requested', () => {
    const { container } = render(<Badge t={t} tone="success" dot>Live</Badge>);
    expect(screen.getByText('Live')).toBeTruthy();
    expect(container.querySelectorAll('span').length).toBeGreaterThanOrEqual(2);
  });
});

describe('StepHeader', () => {
  it('renders eyebrow, title, and subtitle', () => {
    render(<StepHeader t={t} eyebrow="Step 1 of 5" title="Hello" subtitle="Sub" />);
    expect(screen.getByText('Step 1 of 5')).toBeTruthy();
    expect(screen.getByText('Hello')).toBeTruthy();
    expect(screen.getByText('Sub')).toBeTruthy();
  });
});

describe('FieldLabel', () => {
  it('renders optional marker when optional', () => {
    render(<FieldLabel t={t} optional>Business name</FieldLabel>);
    expect(screen.getByText('optional')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Expect fail**

Run: `npx vitest run tests/business/ui/static-primitives.test.tsx` → FAIL (modules missing).

- [ ] **Step 3: Implement Card**

```tsx
// components/business/ui/Card.tsx
'use client';
import type { CSSProperties, ReactNode } from 'react';
import type { Tokens } from './tokens';

interface CardProps {
  t: Tokens;
  children: ReactNode;
  style?: CSSProperties;
  padding?: number;
}

export function Card({ t, children, style, padding = 24 }: CardProps) {
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        boxShadow: t.shadowSm,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default Card;
```

- [ ] **Step 4: Implement Badge**

```tsx
// components/business/ui/Badge.tsx
'use client';
import type { ReactNode } from 'react';
import { FONT, type Tokens } from './tokens';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

interface BadgeProps {
  t: Tokens;
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
}

export function Badge({ t, tone = 'neutral', children, dot }: BadgeProps) {
  const tones: Record<Tone, { bg: string; fg: string; dc: string }> = {
    neutral: { bg: t.surfaceAlt, fg: t.textMuted, dc: t.textFaint },
    success: { bg: 'rgba(5,150,105,0.10)', fg: t.success, dc: t.success },
    warning: { bg: 'rgba(217,119,6,0.12)', fg: t.warning, dc: t.warning },
    danger: { bg: 'rgba(220,38,38,0.10)', fg: t.danger, dc: t.danger },
    accent: { bg: t.accentSoft, fg: t.accent, dc: t.accent },
  };
  const tn = tones[tone];
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 9px', borderRadius: 999,
        fontSize: 12, fontWeight: 550,
        background: tn.bg, color: tn.fg,
        fontFamily: FONT, lineHeight: 1.3,
        border: `1px solid ${t.border}`,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6, height: 6, borderRadius: 999, background: tn.dc,
          }}
        />
      )}
      {children}
    </span>
  );
}

export default Badge;
```

- [ ] **Step 5: Implement StepHeader**

```tsx
// components/business/ui/StepHeader.tsx
'use client';
import { FONT, type Tokens } from './tokens';

interface StepHeaderProps {
  t: Tokens;
  eyebrow: string;
  title: string;
  subtitle?: string;
}

export function StepHeader({ t, eyebrow, title, subtitle }: StepHeaderProps) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          fontSize: 12, fontWeight: 600, color: t.accent,
          fontFamily: FONT, textTransform: 'uppercase',
          letterSpacing: 0.6, marginBottom: 8,
        }}
      >
        {eyebrow}
      </div>
      <h1
        style={{
          margin: 0, fontSize: 28, fontWeight: 700, color: t.text,
          letterSpacing: -0.6, fontFamily: FONT, lineHeight: 1.15,
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            margin: '10px 0 0', fontSize: 15, color: t.textMuted,
            fontFamily: FONT, lineHeight: 1.55, maxWidth: 560,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default StepHeader;
```

- [ ] **Step 6: Implement FieldLabel**

```tsx
// components/business/ui/FieldLabel.tsx
'use client';
import type { ReactNode } from 'react';
import { FONT, type Tokens } from './tokens';

interface FieldLabelProps {
  t: Tokens;
  children: ReactNode;
  hint?: string;
  optional?: boolean;
}

export function FieldLabel({ t, children, hint, optional }: FieldLabelProps) {
  return (
    <div
      style={{
        marginBottom: 8,
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      <label
        style={{
          fontSize: 14, fontWeight: 600, color: t.text,
          fontFamily: FONT, letterSpacing: -0.1,
        }}
      >
        {children}
        {optional && (
          <span
            style={{
              color: t.textFaint, fontWeight: 500, marginLeft: 6, fontSize: 13,
            }}
          >
            optional
          </span>
        )}
      </label>
      {hint && (
        <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT }}>
          {hint}
        </span>
      )}
    </div>
  );
}

export default FieldLabel;
```

- [ ] **Step 7: Run test — expect pass**

Run: `npx vitest run tests/business/ui/static-primitives.test.tsx` → PASS (4 tests).

- [ ] **Step 8: Commit**

```bash
git add components/business/ui/Card.tsx components/business/ui/Badge.tsx components/business/ui/StepHeader.tsx components/business/ui/FieldLabel.tsx tests/business/ui/static-primitives.test.tsx
git commit -m "feat(business): add Card, Badge, StepHeader, FieldLabel primitives"
```

---

## Task 6: Radio, Checkbox, Toggle primitives (batched)

These three are the interactive form primitives used by wizard steps.

**Files:**
- Create: `components/business/ui/Radio.tsx`, `Checkbox.tsx`, `Toggle.tsx`
- Create: `tests/business/ui/interactive-primitives.test.tsx`

- [ ] **Step 1: Test**

```tsx
// tests/business/ui/interactive-primitives.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Radio } from '@/components/business/ui/Radio';
import { Checkbox } from '@/components/business/ui/Checkbox';
import { Toggle } from '@/components/business/ui/Toggle';
import { t } from '@/components/business/ui/tokens';

describe('Radio', () => {
  it('calls onChange when clicked', () => {
    const onChange = vi.fn();
    render(<Radio t={t} checked={false} onChange={onChange} label="A" description="desc" />);
    fireEvent.click(screen.getByText('A'));
    expect(onChange).toHaveBeenCalled();
  });
});

describe('Checkbox', () => {
  it('toggles value via onChange', () => {
    const onChange = vi.fn();
    render(<Checkbox t={t} checked={false} onChange={onChange} label="Accept" />);
    fireEvent.click(screen.getByText('Accept'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('Toggle', () => {
  it('flips state via onChange', () => {
    const onChange = vi.fn();
    render(<Toggle t={t} checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
```

- [ ] **Step 2: Expect fail**

Run: `npx vitest run tests/business/ui/interactive-primitives.test.tsx` → FAIL.

- [ ] **Step 3: Implement Radio**

```tsx
// components/business/ui/Radio.tsx
'use client';
import type { ReactNode } from 'react';
import { FONT, type Tokens } from './tokens';

interface RadioProps {
  t: Tokens;
  checked: boolean;
  onChange?: () => void;
  label: string;
  description?: string;
  icon?: ReactNode;
}

export function Radio({ t, checked, onChange, label, description, icon }: RadioProps) {
  return (
    <label
      onClick={() => onChange?.()}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14, padding: 16,
        borderRadius: 12, cursor: 'pointer',
        background: checked ? t.accentSoft : t.surface,
        border: `1.5px solid ${checked ? t.accent : t.border}`,
        boxShadow: checked ? `0 0 0 3px ${t.ring}` : 'none',
        transition: 'border-color .12s, box-shadow .12s, background .12s',
      }}
    >
      <div
        style={{
          width: 18, height: 18, borderRadius: 999, marginTop: 2,
          border: `1.5px solid ${checked ? t.accent : t.borderStrong}`,
          background: checked ? t.accent : t.surface,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {checked && <div style={{ width: 6, height: 6, borderRadius: 999, background: '#fff' }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon && <div style={{ color: checked ? t.accent : t.textMuted }}>{icon}</div>}
          <div style={{ fontWeight: 600, color: t.text, fontSize: 14, fontFamily: FONT }}>{label}</div>
        </div>
        {description && (
          <div
            style={{
              marginTop: 4, fontSize: 13, color: t.textMuted, fontFamily: FONT, lineHeight: 1.5,
            }}
          >
            {description}
          </div>
        )}
      </div>
    </label>
  );
}

export default Radio;
```

- [ ] **Step 4: Implement Checkbox**

```tsx
// components/business/ui/Checkbox.tsx
'use client';
import { FONT, type Tokens } from './tokens';
import { Icon } from './Icon';

interface CheckboxProps {
  t: Tokens;
  checked: boolean;
  onChange?: (next: boolean) => void;
  label: string;
  description?: string;
}

export function Checkbox({ t, checked, onChange, label, description }: CheckboxProps) {
  return (
    <label
      onClick={() => onChange?.(!checked)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        cursor: 'pointer', padding: '4px 0',
      }}
    >
      <div
        style={{
          width: 18, height: 18, borderRadius: 5, marginTop: 1,
          border: `1.5px solid ${checked ? t.accent : t.borderStrong}`,
          background: checked ? t.accent : t.surface,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .12s', flexShrink: 0,
        }}
      >
        {checked && <Icon name="check" size={12} color="#fff" />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: t.text, fontFamily: FONT, fontWeight: 500 }}>{label}</div>
        {description && (
          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 2, fontFamily: FONT }}>
            {description}
          </div>
        )}
      </div>
    </label>
  );
}

export default Checkbox;
```

- [ ] **Step 5: Implement Toggle**

```tsx
// components/business/ui/Toggle.tsx
'use client';
import type { Tokens } from './tokens';

interface ToggleProps {
  t: Tokens;
  checked: boolean;
  onChange?: (next: boolean) => void;
}

export function Toggle({ t, checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!checked)}
      style={{
        width: 40, height: 24, borderRadius: 999, padding: 2, border: 'none',
        cursor: 'pointer',
        background: checked ? t.accent : t.borderStrong,
        transition: 'background .15s',
        display: 'flex', alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 20, height: 20, borderRadius: 999, background: '#fff',
          transform: `translateX(${checked ? 16 : 0}px)`,
          transition: 'transform .18s cubic-bezier(.3,.6,.3,1)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}

export default Toggle;
```

- [ ] **Step 6: Run tests — expect pass**

Run: `npx vitest run tests/business/ui/interactive-primitives.test.tsx` → PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add components/business/ui/Radio.tsx components/business/ui/Checkbox.tsx components/business/ui/Toggle.tsx tests/business/ui/interactive-primitives.test.tsx
git commit -m "feat(business): add Radio, Checkbox, Toggle primitives"
```

---

## Task 7: Intake store (Zustand + persist)

**Files:**
- Create: `lib/business-intake-store.ts`
- Create: `tests/lib/business-intake-store.test.ts`

- [ ] **Step 1: Test**

```ts
// tests/lib/business-intake-store.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { useBusinessIntakeStore } from '@/lib/business-intake-store';

describe('business intake store', () => {
  beforeEach(() => {
    useBusinessIntakeStore.setState({ intakes: {} });
    localStorage.clear();
  });

  it('initialises a new intake with defaults seeded from bizName', () => {
    useBusinessIntakeStore.getState().init('org_1', 'business_starter', 'Keller Studio');
    const data = useBusinessIntakeStore.getState().get('org_1');
    expect(data).not.toBeNull();
    expect(data!.planCode).toBe('business_starter');
    expect(data!.website.bizName).toBe('Keller Studio');
    expect(data!.dns.mode).toBe('jbp');
    expect(data!.currentStep).toBe(0);
    expect(data!.completedAt).toBeNull();
  });

  it('applies deep-merged updates via update()', () => {
    useBusinessIntakeStore.getState().init('org_2', 'business_pro', 'Acme');
    useBusinessIntakeStore.getState().update('org_2', { domain: { mode: 'register', search: 'acme' } });
    const data = useBusinessIntakeStore.getState().get('org_2');
    expect(data!.domain.mode).toBe('register');
    expect(data!.domain.search).toBe('acme');
    // Unrelated fields preserved
    expect(data!.website.bizName).toBe('Acme');
  });

  it('setStep clamps to the wizard range', () => {
    useBusinessIntakeStore.getState().init('org_3', 'business_starter', 'Test');
    useBusinessIntakeStore.getState().setStep('org_3', 7);
    expect(useBusinessIntakeStore.getState().get('org_3')!.currentStep).toBe(4);
    useBusinessIntakeStore.getState().setStep('org_3', -1);
    expect(useBusinessIntakeStore.getState().get('org_3')!.currentStep).toBe(0);
  });

  it('complete() stamps completedAt', () => {
    useBusinessIntakeStore.getState().init('org_4', 'business_starter', 'Test');
    useBusinessIntakeStore.getState().complete('org_4');
    const data = useBusinessIntakeStore.getState().get('org_4');
    expect(data!.completedAt).not.toBeNull();
    expect(() => new Date(data!.completedAt!)).not.toThrow();
  });
});
```

- [ ] **Step 2: Expect fail**

Run: `npx vitest run tests/lib/business-intake-store.test.ts` → FAIL.

- [ ] **Step 3: Implement**

```ts
// lib/business-intake-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BusinessPlanCode = 'business_starter' | 'business_pro';

export interface BusinessIntakeData {
  orgId: string;
  planCode: BusinessPlanCode;
  currentStep: 0 | 1 | 2 | 3 | 4;
  dns: { mode: 'jbp' | 'self' | 'skip'; provider?: string };
  website: {
    bizName: string;
    bizType: string;
    tagline: string;
    description: string;
    logoName: string | null;
    photoCount: number;
    tone: string;
    aesthetic: 'bold' | 'simple' | 'choose';
    customColor?: string;
    customFont?: string;
    letUsWrite: boolean;
  };
  domain: {
    mode: 'transfer' | 'connect' | 'register';
    domain?: string;
    epp?: string;
    registrar?: string;
    unlocked?: boolean;
    search?: string;
  };
  contact: {
    firstName: string;
    lastName: string;
    org?: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    whois: boolean;
  };
  completedAt: string | null;
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

interface StoreState {
  intakes: Record<string, BusinessIntakeData>;
  get: (orgId: string) => BusinessIntakeData | null;
  init: (orgId: string, planCode: BusinessPlanCode, bizName: string) => void;
  update: (orgId: string, patch: DeepPartial<BusinessIntakeData>) => void;
  setStep: (orgId: string, step: number) => void;
  complete: (orgId: string) => void;
}

function defaults(orgId: string, planCode: BusinessPlanCode, bizName: string): BusinessIntakeData {
  return {
    orgId,
    planCode,
    currentStep: 0,
    dns: { mode: 'jbp' },
    website: {
      bizName,
      bizType: '',
      tagline: '',
      description: '',
      logoName: null,
      photoCount: 0,
      tone: 'Friendly',
      aesthetic: 'simple',
      letUsWrite: true,
    },
    domain: { mode: 'connect' },
    contact: {
      firstName: '', lastName: '',
      email: '', phone: '',
      address: '', city: '', state: '', zip: '',
      whois: true,
    },
    completedAt: null,
  };
}

// Shallow-typed deep merge; safe because our state shape is finite and object-only at the top two levels.
function deepMerge<T>(base: T, patch: DeepPartial<T>): T {
  if (patch === undefined || patch === null) return base;
  if (typeof base !== 'object' || base === null) return patch as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    const current = (base as Record<string, unknown>)[k];
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && typeof current === 'object' && current !== null) {
      out[k] = deepMerge(current, v as DeepPartial<unknown>);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

function clampStep(n: number): 0 | 1 | 2 | 3 | 4 {
  if (n < 0) return 0;
  if (n > 4) return 4;
  return n as 0 | 1 | 2 | 3 | 4;
}

export const useBusinessIntakeStore = create<StoreState>()(
  persist(
    (set, get) => ({
      intakes: {},
      get: (orgId) => get().intakes[orgId] ?? null,
      init: (orgId, planCode, bizName) =>
        set((s) => {
          if (s.intakes[orgId]) return s;
          return { intakes: { ...s.intakes, [orgId]: defaults(orgId, planCode, bizName) } };
        }),
      update: (orgId, patch) =>
        set((s) => {
          const curr = s.intakes[orgId];
          if (!curr) return s;
          return { intakes: { ...s.intakes, [orgId]: deepMerge(curr, patch) } };
        }),
      setStep: (orgId, step) =>
        set((s) => {
          const curr = s.intakes[orgId];
          if (!curr) return s;
          return {
            intakes: {
              ...s.intakes,
              [orgId]: { ...curr, currentStep: clampStep(step) },
            },
          };
        }),
      complete: (orgId) =>
        set((s) => {
          const curr = s.intakes[orgId];
          if (!curr) return s;
          return {
            intakes: {
              ...s.intakes,
              [orgId]: { ...curr, completedAt: new Date().toISOString() },
            },
          };
        }),
    }),
    { name: 'business-intake-store' },
  ),
);
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx vitest run tests/lib/business-intake-store.test.ts` → PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/business-intake-store.ts tests/lib/business-intake-store.test.ts
git commit -m "feat(business): add intake store with zustand persist"
```

---

## Task 8: Stepper component

**Files:**
- Create: `components/business/wizard/Stepper.tsx`
- Create: `tests/business/wizard/Stepper.test.tsx`

- [ ] **Step 1: Test**

```tsx
// tests/business/wizard/Stepper.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stepper } from '@/components/business/wizard/Stepper';
import { t } from '@/components/business/ui/tokens';

describe('Stepper', () => {
  it('renders each step label', () => {
    render(<Stepper t={t} steps={['DNS', 'Website', 'Domain']} current={1} />);
    expect(screen.getByText('DNS')).toBeTruthy();
    expect(screen.getByText('Website')).toBeTruthy();
    expect(screen.getByText('Domain')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Expect fail** → Run, confirm.

- [ ] **Step 3: Implement**

```tsx
// components/business/wizard/Stepper.tsx
'use client';
import { Fragment } from 'react';
import { FONT, type Tokens } from '@/components/business/ui/tokens';
import { Icon } from '@/components/business/ui/Icon';

interface StepperProps {
  t: Tokens;
  steps: string[];
  current: number;
}

export function Stepper({ t, steps, current }: StepperProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT }}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <Fragment key={`${s}-${i}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 26, height: 26, borderRadius: 999,
                  background: done ? t.accent : active ? t.surface : t.surfaceAlt,
                  border: `1.5px solid ${done || active ? t.accent : t.border}`,
                  color: done ? '#fff' : active ? t.accent : t.textMuted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600,
                  boxShadow: active ? `0 0 0 3px ${t.ring}` : 'none',
                  transition: 'all .15s',
                }}
              >
                {done ? <Icon name="check" size={14} color="#fff" /> : i + 1}
              </div>
              <div
                style={{
                  fontSize: 13, fontWeight: active ? 600 : 500,
                  color: active || done ? t.text : t.textMuted,
                  letterSpacing: -0.1,
                }}
              >
                {s}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1, height: 1,
                  background: done ? t.accent : t.border,
                  transition: 'background .15s', minWidth: 20, maxWidth: 60,
                }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

export default Stepper;
```

- [ ] **Step 4: Run test — expect pass**

- [ ] **Step 5: Commit**

```bash
git add components/business/wizard/Stepper.tsx tests/business/wizard/Stepper.test.tsx
git commit -m "feat(business): add wizard Stepper component"
```

---

## Task 9: SummaryRow + AestheticCard helpers

**Files:**
- Create: `components/business/wizard/SummaryRow.tsx`
- Create: `components/business/wizard/AestheticCard.tsx`
- Create: `tests/business/wizard/helpers.test.tsx`

- [ ] **Step 1: Test**

```tsx
// tests/business/wizard/helpers.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SummaryRow } from '@/components/business/wizard/SummaryRow';
import { AestheticCard } from '@/components/business/wizard/AestheticCard';
import { t } from '@/components/business/ui/tokens';

describe('SummaryRow', () => {
  it('renders label and value', () => {
    render(<SummaryRow t={t} label="Plan" value="Starter" />);
    expect(screen.getByText('Plan')).toBeTruthy();
    expect(screen.getByText('Starter')).toBeTruthy();
  });
});

describe('AestheticCard', () => {
  it('fires onClick with its id', () => {
    const onClick = vi.fn();
    render(
      <AestheticCard
        t={t}
        id="bold"
        selected="simple"
        onClick={onClick}
        title="Bold"
        description="desc"
        swatches={['#000']}
        fontLabel="Inter"
        sample={{ bg: '#fff', fg: '#000', font: 'Inter', weight: 700, size: 20, tracking: '0', text: 'Hi' }}
      />
    );
    fireEvent.click(screen.getByText('Bold'));
    expect(onClick).toHaveBeenCalledWith('bold');
  });
});
```

- [ ] **Step 2: Expect fail** → confirm.

- [ ] **Step 3: Implement SummaryRow**

```tsx
// components/business/wizard/SummaryRow.tsx
'use client';
import type { ReactNode } from 'react';
import { FONT, MONO, type Tokens } from '@/components/business/ui/tokens';

interface SummaryRowProps {
  t: Tokens;
  label: string;
  value: ReactNode;
  mono?: boolean;
}

export function SummaryRow({ t, label, value, mono }: SummaryRowProps) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start',
        padding: '14px 0',
        borderBottom: `1px solid ${t.border}`,
        fontFamily: FONT,
      }}
    >
      <div style={{ width: 180, fontSize: 13, color: t.textMuted, fontWeight: 500 }}>
        {label}
      </div>
      <div
        style={{
          flex: 1, fontSize: 14, color: t.text,
          fontFamily: mono ? MONO : FONT, fontWeight: 500,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default SummaryRow;
```

- [ ] **Step 4: Implement AestheticCard**

```tsx
// components/business/wizard/AestheticCard.tsx
'use client';
import { FONT, MONO, type Tokens } from '@/components/business/ui/tokens';
import { Icon } from '@/components/business/ui/Icon';

export interface AestheticSample {
  bg: string;
  fg: string;
  font: string;
  weight: number;
  size: number;
  tracking: string;
  text: string;
}

interface AestheticCardProps {
  t: Tokens;
  id: 'bold' | 'simple' | 'choose';
  selected: 'bold' | 'simple' | 'choose';
  onClick: (id: 'bold' | 'simple' | 'choose') => void;
  title: string;
  description: string;
  swatches: string[];
  fontLabel: string;
  sample: AestheticSample;
}

export function AestheticCard({
  t, id, selected, onClick, title, description, swatches, fontLabel, sample,
}: AestheticCardProps) {
  const on = selected === id;
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      style={{
        textAlign: 'left', padding: 0, cursor: 'pointer',
        background: on ? t.accentSoft : t.surface,
        border: `1.5px solid ${on ? t.accent : t.border}`,
        borderRadius: 12, overflow: 'hidden', fontFamily: FONT,
        boxShadow: on ? `0 0 0 3px ${t.ring}` : 'none',
        transition: 'all .12s',
      }}
    >
      <div
        style={{
          height: 108, padding: '16px 18px',
          background: sample.bg,
          borderBottom: `1px solid ${on ? t.accent : t.border}`,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            fontFamily: sample.font, fontWeight: sample.weight,
            fontSize: sample.size, letterSpacing: sample.tracking,
            color: sample.fg, lineHeight: 1.1, whiteSpace: 'pre-line',
          }}
        >
          {sample.text}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {swatches.map((c, i) => (
            <div
              key={`${c}-${i}`}
              style={{
                width: 18, height: 18, borderRadius: 5, background: c,
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text, letterSpacing: -0.1 }}>
            {title}
          </div>
          {on && <Icon name="check" size={13} color={t.accent} />}
        </div>
        <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 4, lineHeight: 1.45 }}>
          {description}
        </div>
        <div
          style={{
            fontSize: 11, color: t.textFaint, marginTop: 8,
            fontFamily: MONO, letterSpacing: 0.2,
          }}
        >
          {fontLabel}
        </div>
      </div>
    </button>
  );
}

export default AestheticCard;
```

- [ ] **Step 5: Run tests — expect pass**

- [ ] **Step 6: Commit**

```bash
git add components/business/wizard/SummaryRow.tsx components/business/wizard/AestheticCard.tsx tests/business/wizard/helpers.test.tsx
git commit -m "feat(business): add SummaryRow and AestheticCard helpers"
```

---

## Tasks 10–14: Wizard steps (StepDNS, StepWebsite, StepDomain, StepContact, StepConfirm)

Each step is a pure presentational component receiving `t`, `data` (`BusinessIntakeData`), and `set` (deep-merge patch fn). Interaction contract: calling `set({ dns: { mode: 'self' } })` merges into the store.

### Task 10: StepDNS

**Files:**
- Create: `components/business/wizard/StepDNS.tsx`
- Create: `tests/business/wizard/StepDNS.test.tsx`

- [ ] **Step 1: Test**

```tsx
// tests/business/wizard/StepDNS.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepDNS } from '@/components/business/wizard/StepDNS';
import { t } from '@/components/business/ui/tokens';
import type { BusinessIntakeData } from '@/lib/business-intake-store';

const base: Pick<BusinessIntakeData, 'dns'> = { dns: { mode: 'jbp' } };

describe('StepDNS', () => {
  it('calls set with new dns mode when a different radio is clicked', () => {
    const set = vi.fn();
    render(<StepDNS t={t} data={base as BusinessIntakeData} set={set} />);
    fireEvent.click(screen.getByText(/I'll manage my own DNS/));
    expect(set).toHaveBeenCalledWith({ dns: { mode: 'self' } });
  });

  it('shows the provider picker when mode is self', () => {
    render(<StepDNS t={t} data={{ dns: { mode: 'self' } } as BusinessIntakeData} set={() => {}} />);
    expect(screen.getByText('Cloudflare')).toBeTruthy();
    expect(screen.getByText('Route 53')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Expect fail** → confirm.

- [ ] **Step 3: Implement**

```tsx
// components/business/wizard/StepDNS.tsx
'use client';
import type { BusinessIntakeData } from '@/lib/business-intake-store';
import { FONT, MONO, type Tokens } from '@/components/business/ui/tokens';
import { StepHeader } from '@/components/business/ui/StepHeader';
import { FieldLabel } from '@/components/business/ui/FieldLabel';
import { Radio } from '@/components/business/ui/Radio';
import { Icon } from '@/components/business/ui/Icon';

type Patch = { dns?: Partial<BusinessIntakeData['dns']> };

interface Props {
  t: Tokens;
  data: BusinessIntakeData;
  set: (patch: Patch) => void;
}

const PROVIDERS = ['Cloudflare', 'Route 53', 'Google', 'Other'] as const;

export function StepDNS({ t, data, set }: Props) {
  return (
    <div>
      <StepHeader
        t={t}
        eyebrow="Step 1 of 5"
        title="How do you want to manage DNS?"
        subtitle="Choose who's in charge of your DNS records. You can always switch later — nothing here is permanent."
      />
      <div style={{ display: 'grid', gap: 12 }}>
        <Radio
          t={t}
          checked={data.dns.mode === 'jbp'}
          onChange={() => set({ dns: { mode: 'jbp' } })}
          icon={<Icon name="sparkle" size={18} />}
          label="Let Javelina manage it (recommended)"
          description="We'll point your domain at our nameservers and wire up everything — A, AAAA, CNAME, MX — automatically."
        />
        <Radio
          t={t}
          checked={data.dns.mode === 'self'}
          onChange={() => set({ dns: { mode: 'self' } })}
          icon={<Icon name="server" size={18} />}
          label="I'll manage my own DNS"
          description="Keep your current DNS provider (Cloudflare, Route 53, etc). We'll give you the records to add."
        />
        <Radio
          t={t}
          checked={data.dns.mode === 'skip'}
          onChange={() => set({ dns: { mode: 'skip' } })}
          icon={<Icon name="globe" size={18} />}
          label="Skip for now"
          description="Your site will live at a Javelina subdomain. You can add a custom domain whenever you're ready."
        />
      </div>

      {data.dns.mode === 'jbp' && (
        <div
          style={{
            marginTop: 20, padding: 16,
            background: t.accentSoft, borderRadius: 10,
            border: `1px solid ${t.accent}22`,
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}
        >
          <div style={{ color: t.accent, marginTop: 2 }}><Icon name="info" size={16} /></div>
          <div style={{ fontSize: 13, color: t.text, fontFamily: FONT, lineHeight: 1.5 }}>
            You'll update nameservers at your registrar to{' '}
            <span
              style={{
                fontFamily: MONO, fontSize: 12,
                background: t.surface, padding: '2px 6px',
                borderRadius: 4, border: `1px solid ${t.border}`,
              }}
            >
              ns1.javelina.app
            </span>{' '}
            and{' '}
            <span
              style={{
                fontFamily: MONO, fontSize: 12,
                background: t.surface, padding: '2px 6px',
                borderRadius: 4, border: `1px solid ${t.border}`,
              }}
            >
              ns2.javelina.app
            </span>
            . Propagation usually takes 15 minutes to an hour.
          </div>
        </div>
      )}

      {data.dns.mode === 'self' && (
        <div style={{ marginTop: 20 }}>
          <FieldLabel t={t}>Current DNS provider</FieldLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {PROVIDERS.map((p) => {
              const on = data.dns.provider === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => set({ dns: { provider: p } })}
                  style={{
                    padding: '10px 12px', borderRadius: 8,
                    fontFamily: FONT, fontSize: 13,
                    background: on ? t.accentSoft : t.surface,
                    border: `1.5px solid ${on ? t.accent : t.border}`,
                    color: on ? t.accent : t.text,
                    cursor: 'pointer', fontWeight: 550,
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default StepDNS;
```

- [ ] **Step 4: Run test — expect pass**

- [ ] **Step 5: Commit**

```bash
git add components/business/wizard/StepDNS.tsx tests/business/wizard/StepDNS.test.tsx
git commit -m "feat(business): add wizard StepDNS"
```

---

### Task 11: StepWebsite

**Files:**
- Create: `components/business/wizard/StepWebsite.tsx`
- Create: `tests/business/wizard/StepWebsite.test.tsx`

- [ ] **Step 1: Test**

```tsx
// tests/business/wizard/StepWebsite.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepWebsite } from '@/components/business/wizard/StepWebsite';
import { t } from '@/components/business/ui/tokens';
import type { BusinessIntakeData } from '@/lib/business-intake-store';

const data = {
  website: {
    bizName: '', bizType: '', tagline: '', description: '',
    logoName: null, photoCount: 0,
    tone: 'Friendly', aesthetic: 'simple' as const,
    letUsWrite: true,
  },
} as BusinessIntakeData;

describe('StepWebsite', () => {
  it('updates bizName on input', () => {
    const set = vi.fn();
    render(<StepWebsite t={t} data={data} set={set} />);
    fireEvent.change(screen.getByPlaceholderText(/Keller Studio/), { target: { value: 'Acme' } });
    expect(set).toHaveBeenCalledWith({ website: { bizName: 'Acme' } });
  });

  it('switches aesthetic when a card is clicked', () => {
    const set = vi.fn();
    render(<StepWebsite t={t} data={data} set={set} />);
    fireEvent.click(screen.getByText('Bold & editorial'));
    expect(set).toHaveBeenCalledWith({ website: { aesthetic: 'bold' } });
  });
});
```

- [ ] **Step 2: Expect fail** → confirm.

- [ ] **Step 3: Implement**

```tsx
// components/business/wizard/StepWebsite.tsx
'use client';
import type { BusinessIntakeData } from '@/lib/business-intake-store';
import { FONT, MONO, type Tokens } from '@/components/business/ui/tokens';
import { StepHeader } from '@/components/business/ui/StepHeader';
import { FieldLabel } from '@/components/business/ui/FieldLabel';
import { Input } from '@/components/business/ui/Input';
import { Checkbox } from '@/components/business/ui/Checkbox';
import { Button } from '@/components/business/ui/Button';
import { Icon } from '@/components/business/ui/Icon';
import { AestheticCard } from './AestheticCard';

type W = BusinessIntakeData['website'];
type Patch = { website?: Partial<W> };

interface Props {
  t: Tokens;
  data: BusinessIntakeData;
  set: (patch: Patch) => void;
}

const TONES = ['Friendly', 'Professional', 'Playful', 'Direct', 'Warm', 'Technical'] as const;

const AESTHETICS: Array<{
  id: 'bold' | 'simple' | 'choose';
  title: string;
  description: string;
  swatches: string[];
  fontLabel: string;
  sample: {
    bg: string; fg: string; font: string; weight: number;
    size: number; tracking: string; text: string;
  };
}> = [
  {
    id: 'bold',
    title: 'Bold & editorial',
    description: 'High contrast, oversized serif headlines, saturated accents.',
    swatches: ['#0f0f0f', '#f5f1e8', '#d97706', '#1e4620'],
    fontLabel: 'Fraunces / GT America',
    sample: {
      bg: '#f5f1e8', fg: '#0f0f0f', font: 'Georgia, serif',
      weight: 700, size: 26, tracking: '-0.03em',
      text: 'Made with\nintention.',
    },
  },
  {
    id: 'simple',
    title: 'Simple & professional',
    description: 'Clean sans-serif, generous whitespace, a single restrained accent.',
    swatches: ['#ffffff', '#0f1419', '#e6e8ec', '#0284c7'],
    fontLabel: 'Inter / System UI',
    sample: {
      bg: '#ffffff', fg: '#0f1419', font: 'Inter, system-ui, sans-serif',
      weight: 600, size: 22, tracking: '-0.02em',
      text: 'Clear. Competent.\nCalm.',
    },
  },
  {
    id: 'choose',
    title: 'Let me pick everything',
    description: 'Upload your own logo, pick colors and fonts yourself, and write all the copy.',
    swatches: ['#7c3aed', '#059669', '#d97706', '#e11d48'],
    fontLabel: 'Your choice',
    sample: {
      bg: 'linear-gradient(135deg, #f5f3ff, #ecfdf5)',
      fg: '#1f2937', font: 'system-ui',
      weight: 600, size: 20, tracking: '-0.02em',
      text: 'Your brand,\nyour rules.',
    },
  },
];

export function StepWebsite({ t, data, set }: Props) {
  const w = data.website;
  const update = (patch: Partial<W>) => set({ website: patch });

  return (
    <div>
      <StepHeader
        t={t}
        eyebrow="Step 2 of 5"
        title="Let's build your website"
        subtitle="Tell us about your business. We'll generate the first draft — you can tweak anything after launch."
      />

      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <FieldLabel t={t}>Business name</FieldLabel>
          <Input t={t} value={w.bizName} onChange={(v) => update({ bizName: v })} placeholder="Keller Studio" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FieldLabel t={t}>What do you do?</FieldLabel>
            <Input
              t={t}
              value={w.bizType}
              onChange={(v) => update({ bizType: v })}
              placeholder="Design studio, coffee shop, contractor…"
            />
          </div>
          <div>
            <FieldLabel t={t} optional>Tagline</FieldLabel>
            <Input
              t={t}
              value={w.tagline}
              onChange={(v) => update({ tagline: v })}
              placeholder="A short, memorable one-liner"
            />
          </div>
        </div>

        <div>
          <FieldLabel t={t} hint={`${(w.description || '').length}/280`}>
            Describe your business in a few sentences
          </FieldLabel>
          <textarea
            value={w.description || ''}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Independent studio helping small teams ship products that feel considered."
            rows={3}
            style={{
              width: '100%', padding: '10px 12px',
              fontSize: 14, fontFamily: FONT,
              borderRadius: 8, border: `1px solid ${t.border}`,
              background: t.surface, color: t.text, resize: 'vertical',
              outline: 'none', lineHeight: 1.5, boxShadow: t.shadowSm,
            }}
          />
        </div>

        <div>
          <FieldLabel t={t} optional>Logo</FieldLabel>
          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
            <div
              style={{
                width: 80, height: 80, borderRadius: 10,
                border: `1.5px dashed ${t.borderStrong}`,
                background: t.surfaceAlt,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.textMuted, fontSize: 11, fontFamily: MONO,
                textAlign: 'center', padding: 6,
              }}
            >
              {w.logoName ? (
                <div style={{ color: t.text, fontWeight: 600, wordBreak: 'break-all' }}>
                  ✓<br />{w.logoName}
                </div>
              ) : (
                'no file'
              )}
            </div>
            <div
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                justifyContent: 'center', gap: 8,
              }}
            >
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  t={t}
                  variant="secondary"
                  size="sm"
                  onClick={() => update({ logoName: 'logo-mark.svg' })}
                  iconLeft={<Icon name="plus" size={13} />}
                >
                  Upload logo
                </Button>
                <Button
                  t={t}
                  variant="ghost"
                  size="sm"
                  onClick={() => update({ logoName: null })}
                >
                  Skip — use text wordmark
                </Button>
              </div>
              <div style={{ fontSize: 12, color: t.textMuted }}>
                SVG or PNG, transparent background works best. We'll generate favicons automatically.
              </div>
            </div>
          </div>
        </div>

        <div>
          <FieldLabel t={t} optional>Photos &amp; imagery</FieldLabel>
          <div
            style={{
              padding: 16, borderRadius: 10,
              border: `1.5px dashed ${t.borderStrong}`,
              background: t.surfaceAlt,
              display: 'flex', alignItems: 'center', gap: 14,
            }}
          >
            <div
              style={{
                width: 38, height: 38, borderRadius: 8,
                background: t.surface, border: `1px solid ${t.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.textMuted,
              }}
            >
              <Icon name="plus" size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text }}>
                {w.photoCount
                  ? `${w.photoCount} photos ready`
                  : 'Drop product shots, team photos, or work samples'}
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                Up to 20 files. We'll optimize and lay them out.
              </div>
            </div>
            <Button
              t={t}
              variant="secondary"
              size="sm"
              onClick={() => update({ photoCount: (w.photoCount || 0) + 6 })}
            >
              Browse files
            </Button>
          </div>
        </div>

        <div>
          <FieldLabel t={t}>Copy tone</FieldLabel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TONES.map((tn) => {
              const on = w.tone === tn;
              return (
                <button
                  key={tn}
                  type="button"
                  onClick={() => update({ tone: tn })}
                  style={{
                    padding: '7px 13px', borderRadius: 999,
                    cursor: 'pointer',
                    fontFamily: FONT, fontSize: 13, fontWeight: 550,
                    background: on ? t.accentSoft : t.surface,
                    border: `1.5px solid ${on ? t.accent : t.border}`,
                    color: on ? t.accent : t.text,
                  }}
                >
                  {tn}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 4 }}>
          <FieldLabel t={t} hint="We'll handle typography, color, spacing">
            Pick an aesthetic direction
          </FieldLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {AESTHETICS.map((a) => (
              <AestheticCard
                key={a.id}
                t={t}
                id={a.id}
                selected={w.aesthetic}
                onClick={(v) => update({ aesthetic: v })}
                title={a.title}
                description={a.description}
                swatches={a.swatches}
                fontLabel={a.fontLabel}
                sample={a.sample}
              />
            ))}
          </div>
        </div>

        {w.aesthetic === 'choose' && (
          <div
            style={{
              marginTop: 4, padding: 16, borderRadius: 10,
              background: t.surfaceAlt, border: `1px solid ${t.border}`,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <FieldLabel t={t}>Primary color</FieldLabel>
                <Input
                  t={t}
                  value={w.customColor}
                  onChange={(v) => update({ customColor: v })}
                  placeholder="#EF7215"
                  prefix={
                    <div
                      style={{
                        width: 14, height: 14, borderRadius: 4,
                        background: w.customColor || t.accent,
                        border: `1px solid ${t.border}`,
                      }}
                    />
                  }
                />
              </div>
              <div>
                <FieldLabel t={t}>Font family</FieldLabel>
                <Input
                  t={t}
                  value={w.customFont}
                  onChange={(v) => update({ customFont: v })}
                  placeholder="Inter, Fraunces, IBM Plex…"
                />
              </div>
            </div>
          </div>
        )}

        <Checkbox
          t={t}
          checked={!!w.letUsWrite}
          onChange={(v) => update({ letUsWrite: v })}
          label="Write the copy for me"
          description="We'll draft the homepage, about, and contact sections based on what you told us."
        />
      </div>
    </div>
  );
}

export default StepWebsite;
```

- [ ] **Step 4: Run test — expect pass**

- [ ] **Step 5: Commit**

```bash
git add components/business/wizard/StepWebsite.tsx tests/business/wizard/StepWebsite.test.tsx
git commit -m "feat(business): add wizard StepWebsite"
```

---

### Task 12: StepDomain

**Files:**
- Create: `components/business/wizard/StepDomain.tsx`
- Create: `tests/business/wizard/StepDomain.test.tsx`

- [ ] **Step 1: Test**

```tsx
// tests/business/wizard/StepDomain.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepDomain } from '@/components/business/wizard/StepDomain';
import { t } from '@/components/business/ui/tokens';
import type { BusinessIntakeData } from '@/lib/business-intake-store';

const data = { domain: { mode: 'connect' as const } } as BusinessIntakeData;

describe('StepDomain', () => {
  it('switches to transfer mode', () => {
    const set = vi.fn();
    render(<StepDomain t={t} data={data} set={set} />);
    fireEvent.click(screen.getByText(/Transfer a domain I already own/));
    expect(set).toHaveBeenCalledWith({ domain: { mode: 'transfer' } });
  });

  it('renders mock availability results when registering', () => {
    render(
      <StepDomain
        t={t}
        data={{ domain: { mode: 'register', search: 'myco' } } as BusinessIntakeData}
        set={() => {}}
      />,
    );
    expect(screen.getByText(/\.com/)).toBeTruthy();
    expect(screen.getAllByText(/Available|Taken/).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Expect fail** → confirm.

- [ ] **Step 3: Implement**

```tsx
// components/business/wizard/StepDomain.tsx
'use client';
import type { BusinessIntakeData } from '@/lib/business-intake-store';
import { FONT, MONO, type Tokens } from '@/components/business/ui/tokens';
import { StepHeader } from '@/components/business/ui/StepHeader';
import { FieldLabel } from '@/components/business/ui/FieldLabel';
import { Input } from '@/components/business/ui/Input';
import { Radio } from '@/components/business/ui/Radio';
import { Checkbox } from '@/components/business/ui/Checkbox';
import { Button } from '@/components/business/ui/Button';
import { Badge } from '@/components/business/ui/Badge';
import { Icon } from '@/components/business/ui/Icon';

type D = BusinessIntakeData['domain'];
type Patch = { domain?: Partial<D> };

interface Props {
  t: Tokens;
  data: BusinessIntakeData;
  set: (patch: Patch) => void;
}

const MOCK_TLDS = ['.com', '.app', '.io', '.dev'] as const;
const MOCK_PRICES: Record<string, string> = {
  '.com': '$14.99',
  '.app': '$18.00',
  '.io': '$39.50',
  '.dev': '$15.00',
};

export function StepDomain({ t, data, set }: Props) {
  const d = data.domain;
  const update = (patch: Partial<D>) => set({ domain: patch });

  return (
    <div>
      <StepHeader
        t={t}
        eyebrow="Step 3 of 5"
        title="What's your domain story?"
        subtitle="Got a domain already? Bring it along. Need one? We can register it for you."
      />
      <div style={{ display: 'grid', gap: 12 }}>
        <Radio
          t={t}
          checked={d.mode === 'transfer'}
          onChange={() => update({ mode: 'transfer' })}
          icon={<Icon name="globe" size={18} />}
          label="Transfer a domain I already own"
          description="Move it from GoDaddy, Namecheap, wherever. We handle the EPP code dance."
        />
        <Radio
          t={t}
          checked={d.mode === 'connect'}
          onChange={() => update({ mode: 'connect' })}
          icon={<Icon name="refresh" size={18} />}
          label="Connect a domain without transferring"
          description="Keep it at your current registrar. Just point DNS at us."
        />
        <Radio
          t={t}
          checked={d.mode === 'register'}
          onChange={() => update({ mode: 'register' })}
          icon={<Icon name="plus" size={18} />}
          label="Register a new domain"
          description="Search and buy a fresh one — billed alongside your plan."
        />
      </div>

      {d.mode === 'transfer' && (
        <div style={{ marginTop: 22, display: 'grid', gap: 16 }}>
          <div>
            <FieldLabel t={t} hint="e.g. mycompany.com">Domain to transfer</FieldLabel>
            <Input
              t={t}
              value={d.domain}
              onChange={(v) => update({ domain: v })}
              placeholder="mycompany.com"
              prefix={<Icon name="globe" size={14} />}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <FieldLabel t={t} hint="From your current registrar">Auth / EPP code</FieldLabel>
              <Input
                t={t}
                value={d.epp}
                onChange={(v) => update({ epp: v })}
                placeholder="XXXX-XXXX-XXXX"
                suffix={<Icon name="copy" size={14} />}
              />
            </div>
            <div>
              <FieldLabel t={t}>Current registrar</FieldLabel>
              <Input
                t={t}
                value={d.registrar}
                onChange={(v) => update({ registrar: v })}
                placeholder="GoDaddy, Namecheap, …"
              />
            </div>
          </div>
          <Checkbox
            t={t}
            checked={!!d.unlocked}
            onChange={(v) => update({ unlocked: v })}
            label="My domain is unlocked and eligible for transfer"
            description="Most registrars let you unlock in domain settings. Transfers take up to 5 days."
          />
        </div>
      )}

      {d.mode === 'connect' && (
        <div style={{ marginTop: 22 }}>
          <FieldLabel t={t} hint="We'll give you the records to add">Domain to connect</FieldLabel>
          <Input
            t={t}
            value={d.domain}
            onChange={(v) => update({ domain: v })}
            placeholder="mycompany.com"
            prefix={<Icon name="globe" size={14} />}
          />
        </div>
      )}

      {d.mode === 'register' && (
        <div style={{ marginTop: 22 }}>
          <FieldLabel t={t} hint="From $12/yr">Find a domain</FieldLabel>
          <Input
            t={t}
            value={d.search}
            onChange={(v) => update({ search: v })}
            placeholder="mycompany"
            suffix={
              <Button t={t} size="sm" variant="primary">
                Search
              </Button>
            }
          />

          {d.search && (
            <div
              style={{
                marginTop: 16,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                background: t.surfaceAlt, overflow: 'hidden',
              }}
            >
              {MOCK_TLDS.map((ext, i) => {
                const available = i !== 0; // .com always taken for mock
                return (
                  <div
                    key={ext}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '12px 16px',
                      borderTop: i > 0 ? `1px solid ${t.border}` : 'none',
                      fontFamily: FONT,
                    }}
                  >
                    <div style={{ flex: 1, fontSize: 14, color: t.text, fontFamily: MONO }}>
                      {d.search}
                      <span style={{ color: t.textMuted }}>{ext}</span>
                    </div>
                    {available ? (
                      <>
                        <span style={{ fontSize: 13, color: t.textMuted, marginRight: 14 }}>
                          {MOCK_PRICES[ext]}/yr
                        </span>
                        <Badge t={t} tone="success" dot>Available</Badge>
                      </>
                    ) : (
                      <Badge t={t} tone="neutral">Taken</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StepDomain;
```

- [ ] **Step 4: Run test — expect pass**

- [ ] **Step 5: Commit**

```bash
git add components/business/wizard/StepDomain.tsx tests/business/wizard/StepDomain.test.tsx
git commit -m "feat(business): add wizard StepDomain"
```

---

### Task 13: StepContact

**Files:**
- Create: `components/business/wizard/StepContact.tsx`
- Create: `tests/business/wizard/StepContact.test.tsx`

- [ ] **Step 1: Test**

```tsx
// tests/business/wizard/StepContact.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepContact } from '@/components/business/wizard/StepContact';
import { t } from '@/components/business/ui/tokens';
import type { BusinessIntakeData } from '@/lib/business-intake-store';

const data = {
  contact: {
    firstName: '', lastName: '',
    email: '', phone: '',
    address: '', city: '', state: '', zip: '',
    whois: true,
  },
} as BusinessIntakeData;

describe('StepContact', () => {
  it('updates firstName on input', () => {
    const set = vi.fn();
    render(<StepContact t={t} data={data} set={set} />);
    fireEvent.change(screen.getByPlaceholderText('Jordan'), { target: { value: 'Pat' } });
    expect(set).toHaveBeenCalledWith({ contact: { firstName: 'Pat' } });
  });

  it('toggles WHOIS privacy', () => {
    const set = vi.fn();
    render(<StepContact t={t} data={data} set={set} />);
    const toggles = screen.getAllByRole('button');
    fireEvent.click(toggles[toggles.length - 1]);
    expect(set).toHaveBeenCalledWith({ contact: { whois: false } });
  });
});
```

- [ ] **Step 2: Expect fail** → confirm.

- [ ] **Step 3: Implement**

```tsx
// components/business/wizard/StepContact.tsx
'use client';
import type { BusinessIntakeData } from '@/lib/business-intake-store';
import { FONT, type Tokens } from '@/components/business/ui/tokens';
import { StepHeader } from '@/components/business/ui/StepHeader';
import { FieldLabel } from '@/components/business/ui/FieldLabel';
import { Input } from '@/components/business/ui/Input';
import { Toggle } from '@/components/business/ui/Toggle';
import { Icon } from '@/components/business/ui/Icon';

type C = BusinessIntakeData['contact'];
type Patch = { contact?: Partial<C> };

interface Props {
  t: Tokens;
  data: BusinessIntakeData;
  set: (patch: Patch) => void;
}

export function StepContact({ t, data, set }: Props) {
  const c = data.contact;
  const update = (patch: Partial<C>) => set({ contact: patch });

  return (
    <div>
      <StepHeader
        t={t}
        eyebrow="Step 4 of 5"
        title="Registrar contact details"
        subtitle="ICANN requires accurate contact info on every domain. This stays private — we enable WHOIS privacy by default."
      />

      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FieldLabel t={t}>First name</FieldLabel>
            <Input t={t} value={c.firstName} onChange={(v) => update({ firstName: v })} placeholder="Jordan" />
          </div>
          <div>
            <FieldLabel t={t}>Last name</FieldLabel>
            <Input t={t} value={c.lastName} onChange={(v) => update({ lastName: v })} placeholder="Keller" />
          </div>
        </div>

        <div>
          <FieldLabel t={t} optional>Organization</FieldLabel>
          <Input t={t} value={c.org} onChange={(v) => update({ org: v })} placeholder="Keller Studio, LLC" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FieldLabel t={t}>Email</FieldLabel>
            <Input
              t={t}
              type="email"
              value={c.email}
              onChange={(v) => update({ email: v })}
              placeholder="jordan@example.com"
            />
          </div>
          <div>
            <FieldLabel t={t}>Phone</FieldLabel>
            <Input
              t={t}
              type="tel"
              value={c.phone}
              onChange={(v) => update({ phone: v })}
              placeholder="+1 (555) 010-0110"
            />
          </div>
        </div>

        <div>
          <FieldLabel t={t}>Street address</FieldLabel>
          <Input t={t} value={c.address} onChange={(v) => update({ address: v })} placeholder="1148 Mission St" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
          <div>
            <FieldLabel t={t}>City</FieldLabel>
            <Input t={t} value={c.city} onChange={(v) => update({ city: v })} placeholder="San Francisco" />
          </div>
          <div>
            <FieldLabel t={t}>State</FieldLabel>
            <Input t={t} value={c.state} onChange={(v) => update({ state: v })} placeholder="CA" />
          </div>
          <div>
            <FieldLabel t={t}>Postal</FieldLabel>
            <Input t={t} value={c.zip} onChange={(v) => update({ zip: v })} placeholder="94103" />
          </div>
        </div>

        <div
          style={{
            marginTop: 4, padding: 14,
            background: t.surfaceAlt, borderRadius: 10,
            border: `1px solid ${t.border}`,
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}
        >
          <div style={{ color: t.textMuted, marginTop: 1 }}>
            <Icon name="lock" size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: FONT }}>
              WHOIS privacy is on
            </div>
            <div
              style={{
                fontSize: 12.5, color: t.textMuted,
                fontFamily: FONT, marginTop: 2, lineHeight: 1.5,
              }}
            >
              Your personal details won't show up in public WHOIS lookups. Registrars see them — nobody else.
            </div>
          </div>
          <Toggle t={t} checked={c.whois !== false} onChange={(v) => update({ whois: v })} />
        </div>
      </div>
    </div>
  );
}

export default StepContact;
```

- [ ] **Step 4: Run test — expect pass**

- [ ] **Step 5: Commit**

```bash
git add components/business/wizard/StepContact.tsx tests/business/wizard/StepContact.test.tsx
git commit -m "feat(business): add wizard StepContact"
```

---

### Task 14: StepConfirm

**Files:**
- Create: `components/business/wizard/StepConfirm.tsx`
- Create: `tests/business/wizard/StepConfirm.test.tsx`

- [ ] **Step 1: Test**

```tsx
// tests/business/wizard/StepConfirm.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepConfirm } from '@/components/business/wizard/StepConfirm';
import { t } from '@/components/business/ui/tokens';
import type { BusinessIntakeData } from '@/lib/business-intake-store';

const data: BusinessIntakeData = {
  orgId: 'o1',
  planCode: 'business_starter',
  currentStep: 4,
  dns: { mode: 'jbp' },
  website: {
    bizName: 'Acme', bizType: 'Bakery', tagline: '', description: '',
    logoName: null, photoCount: 0,
    tone: 'Friendly', aesthetic: 'simple', letUsWrite: true,
  },
  domain: { mode: 'connect', domain: 'acme.com' },
  contact: {
    firstName: 'Pat', lastName: 'Lee',
    email: 'pat@acme.com', phone: '',
    address: '', city: '', state: '', zip: '', whois: true,
  },
  completedAt: null,
};

describe('StepConfirm', () => {
  it('renders summary rows including plan-specific deliverables', () => {
    render(<StepConfirm t={t} data={data} />);
    expect(screen.getByText('Acme')).toBeTruthy();
    expect(screen.getByText(/acme.com/)).toBeTruthy();
    // Business Starter plan features should appear
    expect(screen.getByText(/Javelina DNS/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Expect fail** → confirm.

- [ ] **Step 3: Implement**

```tsx
// components/business/wizard/StepConfirm.tsx
'use client';
import type { BusinessIntakeData } from '@/lib/business-intake-store';
import { FONT, type Tokens } from '@/components/business/ui/tokens';
import { StepHeader } from '@/components/business/ui/StepHeader';
import { Card } from '@/components/business/ui/Card';
import { Badge } from '@/components/business/ui/Badge';
import { Icon } from '@/components/business/ui/Icon';
import { SummaryRow } from './SummaryRow';

interface Props {
  t: Tokens;
  data: BusinessIntakeData;
}

// Mirrors BUSINESS_PLAN_FEATURES in lib/plans-config.ts — kept in sync manually
// until plans-config exposes a shared accessor. Update there first, then here.
const PLAN_FEATURES: Record<BusinessIntakeData['planCode'], string[]> = {
  business_starter: [
    'Domain Registration',
    'SSL Certificates',
    'Javelina DNS',
    'Website Hosting (1–3 page site)',
    'Business Email',
    'Fully Managed Business Website',
  ],
  business_pro: [
    'Domain Registration',
    'SSL Certificates',
    'Javelina DNS',
    'Microsoft 365 Email',
    'Business Website (1–5 pages)',
    'Custom AI Agent',
  ],
};

const AESTHETIC_LABEL = {
  bold: 'Bold & editorial',
  simple: 'Simple & professional',
  choose: 'Custom',
} as const;

export function StepConfirm({ t, data }: Props) {
  const dnsLabel =
    data.dns.mode === 'jbp'
      ? 'Javelina managed'
      : data.dns.mode === 'self'
      ? `Self-managed${data.dns.provider ? ` · ${data.dns.provider}` : ''}`
      : 'Skip — use Javelina subdomain';

  const domainLabel =
    data.domain.mode === 'transfer'
      ? `Transfer · ${data.domain.domain || '—'}`
      : data.domain.mode === 'connect'
      ? `Connect · ${data.domain.domain || '—'}`
      : `Register · ${data.domain.search || '—'}.com`;

  const features = PLAN_FEATURES[data.planCode];

  return (
    <div>
      <StepHeader
        t={t}
        eyebrow="Step 5 of 5"
        title="Looks good? Let's ship it."
        subtitle="Review your setup. Your site goes live the moment you confirm."
      />

      <Card t={t} padding={0}>
        <div style={{ padding: '8px 20px' }}>
          <SummaryRow t={t} label="DNS management" value={dnsLabel} />
          <SummaryRow t={t} label="Business" value={data.website.bizName || '—'} />
          <SummaryRow t={t} label="What you do" value={data.website.bizType || '—'} />
          <SummaryRow t={t} label="Aesthetic" value={AESTHETIC_LABEL[data.website.aesthetic]} />
          <SummaryRow t={t} label="Tone" value={data.website.tone || '—'} />
          <SummaryRow
            t={t}
            label="Copy"
            value={data.website.letUsWrite ? 'Javelina will draft for you' : "You'll write it"}
          />
          <SummaryRow t={t} label="Domain" value={domainLabel} mono />
          {data.domain.mode === 'transfer' && (
            <SummaryRow
              t={t}
              label="Auth code"
              value={data.domain.epp ? '••••-••••-' + (data.domain.epp.slice(-4) || 'XXXX') : '—'}
              mono
            />
          )}
          <SummaryRow
            t={t}
            label="Registrant"
            value={[data.contact.firstName, data.contact.lastName].filter(Boolean).join(' ') || '—'}
          />
          <SummaryRow t={t} label="Email" value={data.contact.email || '—'} mono />
          <div
            style={{
              display: 'flex', alignItems: 'flex-start',
              padding: '14px 0', fontFamily: FONT,
            }}
          >
            <div style={{ width: 180, fontSize: 13, color: t.textMuted, fontWeight: 500 }}>
              WHOIS privacy
            </div>
            <Badge t={t} tone={data.contact.whois !== false ? 'success' : 'neutral'} dot>
              {data.contact.whois !== false ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </div>
      </Card>

      <div
        style={{
          marginTop: 20, padding: 16, borderRadius: 12,
          background: t.accentSoft, border: `1px solid ${t.accent}33`,
          display: 'flex', gap: 14, alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: t.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, color: '#fff',
          }}
        >
          <Icon name="rocket" size={18} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: FONT }}>
            What you're getting ({data.planCode === 'business_pro' ? 'Business Pro' : 'Business Starter'})
          </div>
          <ul style={{ margin: '6px 0 0 18px', padding: 0, color: t.textMuted, fontSize: 13, lineHeight: 1.55, fontFamily: FONT }}>
            {features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default StepConfirm;
```

- [ ] **Step 4: Run test — expect pass**

- [ ] **Step 5: Commit**

```bash
git add components/business/wizard/StepConfirm.tsx tests/business/wizard/StepConfirm.test.tsx
git commit -m "feat(business): add wizard StepConfirm"
```

---

## Task 15: BusinessWizardShell

**Files:**
- Create: `components/business/wizard/BusinessWizardShell.tsx`
- Create: `tests/business/wizard/BusinessWizardShell.test.tsx`

- [ ] **Step 1: Test**

```tsx
// tests/business/wizard/BusinessWizardShell.test.tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BusinessWizardShell } from '@/components/business/wizard/BusinessWizardShell';
import { useBusinessIntakeStore } from '@/lib/business-intake-store';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('BusinessWizardShell', () => {
  beforeEach(() => {
    useBusinessIntakeStore.setState({ intakes: {} });
    useBusinessIntakeStore.getState().init('o1', 'business_starter', 'Acme');
  });

  it('advances step when Continue is clicked', () => {
    render(<BusinessWizardShell orgId="o1" />);
    fireEvent.click(screen.getByText('Continue'));
    expect(useBusinessIntakeStore.getState().get('o1')!.currentStep).toBe(1);
  });

  it('shows Launch button on last step', () => {
    useBusinessIntakeStore.getState().setStep('o1', 4);
    render(<BusinessWizardShell orgId="o1" />);
    expect(screen.getByText(/Launch my site/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Expect fail** → confirm.

- [ ] **Step 3: Implement**

```tsx
// components/business/wizard/BusinessWizardShell.tsx
'use client';
import { useRouter } from 'next/navigation';
import { t as tokens, FONT } from '@/components/business/ui/tokens';
import { Card } from '@/components/business/ui/Card';
import { Button } from '@/components/business/ui/Button';
import { Icon } from '@/components/business/ui/Icon';
import { Stepper } from './Stepper';
import { StepDNS } from './StepDNS';
import { StepWebsite } from './StepWebsite';
import { StepDomain } from './StepDomain';
import { StepContact } from './StepContact';
import { StepConfirm } from './StepConfirm';
import { useBusinessIntakeStore } from '@/lib/business-intake-store';

const STEP_LABELS = ['DNS', 'Website', 'Domain', 'Contact', 'Confirm'] as const;

interface Props {
  orgId: string;
}

export function BusinessWizardShell({ orgId }: Props) {
  const router = useRouter();
  const t = tokens;
  const data = useBusinessIntakeStore((s) => s.intakes[orgId]);
  const update = useBusinessIntakeStore((s) => s.update);
  const setStep = useBusinessIntakeStore((s) => s.setStep);
  const complete = useBusinessIntakeStore((s) => s.complete);

  if (!data) {
    return (
      <div style={{ padding: 48, fontFamily: FONT, color: t.textMuted }}>
        Loading your setup…
      </div>
    );
  }

  const step = data.currentStep;
  const set = (patch: Parameters<typeof update>[1]) => update(orgId, patch);

  const onLaunch = () => {
    // eslint-disable-next-line no-console
    console.info('[business-intake] launch payload', data);
    complete(orgId);
    router.push(`/business/${orgId}`);
  };

  const stepContent =
    step === 0 ? <StepDNS t={t} data={data} set={set} /> :
    step === 1 ? <StepWebsite t={t} data={data} set={set} /> :
    step === 2 ? <StepDomain t={t} data={data} set={set} /> :
    step === 3 ? <StepContact t={t} data={data} set={set} /> :
                 <StepConfirm t={t} data={data} />;

  return (
    <div style={{ minHeight: '100%', background: t.bg, fontFamily: FONT }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 32px 60px' }}>
        <div
          style={{
            background: t.surface, borderRadius: 14, padding: '18px 24px',
            border: `1px solid ${t.border}`, boxShadow: t.shadowSm,
            marginBottom: 28,
          }}
        >
          <Stepper t={t} steps={[...STEP_LABELS]} current={step} />
        </div>

        <Card t={t} padding={36}>{stepContent}</Card>

        <div
          style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 24,
          }}
        >
          <Button
            t={t}
            variant="ghost"
            onClick={() => (step > 0 ? setStep(orgId, step - 1) : undefined)}
            disabled={step === 0}
            iconLeft={<Icon name="arrowLeft" size={14} />}
          >
            Back
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: t.textMuted }}>
              Step {step + 1} of {STEP_LABELS.length}
            </span>
            {step < STEP_LABELS.length - 1 ? (
              <Button
                t={t}
                onClick={() => setStep(orgId, step + 1)}
                iconRight={<Icon name="arrowRight" size={14} color="#fff" />}
              >
                Continue
              </Button>
            ) : (
              <Button
                t={t}
                onClick={onLaunch}
                iconRight={<Icon name="rocket" size={14} color="#fff" />}
              >
                Launch my site
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusinessWizardShell;
```

- [ ] **Step 4: Run test — expect pass**

- [ ] **Step 5: Commit**

```bash
git add components/business/wizard/BusinessWizardShell.tsx tests/business/wizard/BusinessWizardShell.test.tsx
git commit -m "feat(business): add BusinessWizardShell"
```

---

## Task 16: `/business` layout + `/business/setup` page

**Files:**
- Create: `app/business/layout.tsx`
- Create: `app/business/setup/page.tsx`

- [ ] **Step 1: Write layout**

```tsx
// app/business/layout.tsx
import type { ReactNode } from 'react';

// Intentionally NOT importing global Tailwind overrides here. The business
// surface uses its own token object (components/business/ui/tokens.ts) and
// inline styles — this layout just isolates the route tree and could inject
// dark-mode detection later without affecting the rest of the app.
export default function BusinessLayout({ children }: { children: ReactNode }) {
  return <div style={{ minHeight: '100vh', background: '#f7f8fa' }}>{children}</div>;
}
```

- [ ] **Step 2: Write setup page**

```tsx
// app/business/setup/page.tsx
'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BusinessWizardShell } from '@/components/business/wizard/BusinessWizardShell';
import {
  useBusinessIntakeStore,
  type BusinessPlanCode,
} from '@/lib/business-intake-store';

function SetupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const orgId = params.get('org_id');
  const planCode = params.get('plan_code') as BusinessPlanCode | null;
  const bizName = params.get('org_name') || 'My business';
  const initStore = useBusinessIntakeStore((s) => s.init);
  const get = useBusinessIntakeStore((s) => s.get);

  useEffect(() => {
    if (!orgId || !planCode) {
      router.push('/pricing');
      return;
    }
    if (!get(orgId)) {
      initStore(orgId, planCode, bizName);
    }
  }, [orgId, planCode, bizName, get, initStore, router]);

  if (!orgId) return null;
  return <BusinessWizardShell orgId={orgId} />;
}

export default function BusinessSetupPage() {
  return (
    <Suspense fallback={null}>
      <SetupInner />
    </Suspense>
  );
}
```

- [ ] **Step 3: Smoke test manually**

Run: `npm run dev`
Visit: `http://localhost:3000/business/setup?org_id=test&plan_code=business_starter&org_name=Acme`
Expected: wizard renders on Step 1 (DNS). Continue advances; Launch redirects to `/business/test`.

- [ ] **Step 4: Commit**

```bash
git add app/business/layout.tsx app/business/setup/page.tsx
git commit -m "feat(business): add /business/setup route + layout"
```

---

## Task 17: `BusinessPlaceholderDashboard` + `/business/[orgId]` page

**Files:**
- Create: `components/business/dashboard/BusinessPlaceholderDashboard.tsx`
- Create: `app/business/[orgId]/page.tsx`
- Create: `tests/business/dashboard/BusinessPlaceholderDashboard.test.tsx`

- [ ] **Step 1: Test**

```tsx
// tests/business/dashboard/BusinessPlaceholderDashboard.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BusinessPlaceholderDashboard } from '@/components/business/dashboard/BusinessPlaceholderDashboard';
import type { BusinessIntakeData } from '@/lib/business-intake-store';

const data: BusinessIntakeData = {
  orgId: 'o1',
  planCode: 'business_starter',
  currentStep: 4,
  dns: { mode: 'jbp' },
  website: {
    bizName: 'Acme', bizType: '', tagline: '', description: '',
    logoName: null, photoCount: 0,
    tone: 'Friendly', aesthetic: 'simple', letUsWrite: true,
  },
  domain: { mode: 'connect', domain: 'acme.com' },
  contact: {
    firstName: 'Pat', lastName: 'Lee',
    email: 'pat@acme.com', phone: '',
    address: '', city: '', state: '', zip: '', whois: true,
  },
  completedAt: '2026-04-22T00:00:00.000Z',
};

describe('BusinessPlaceholderDashboard', () => {
  it('renders status, submitted data, and next steps', () => {
    render(<BusinessPlaceholderDashboard data={data} />);
    expect(screen.getByText(/Acme/)).toBeTruthy();
    expect(screen.getByText(/acme\.com/)).toBeTruthy();
    expect(screen.getByText(/What happens next/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Expect fail** → confirm.

- [ ] **Step 3: Implement dashboard component**

```tsx
// components/business/dashboard/BusinessPlaceholderDashboard.tsx
'use client';
import Link from 'next/link';
import type { BusinessIntakeData } from '@/lib/business-intake-store';
import { FONT, t as tokens } from '@/components/business/ui/tokens';
import { Card } from '@/components/business/ui/Card';
import { Badge } from '@/components/business/ui/Badge';
import { SummaryRow } from '@/components/business/wizard/SummaryRow';

interface Props {
  data: BusinessIntakeData;
}

export function BusinessPlaceholderDashboard({ data }: Props) {
  const t = tokens;
  const planLabel = data.planCode === 'business_pro' ? 'Business Pro' : 'Business Starter';
  const primaryDomain =
    data.domain.mode === 'register'
      ? `${data.domain.search || 'your-domain'}.com`
      : data.domain.domain || 'your-domain.com';

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px 80px', fontFamily: FONT }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: t.textMuted, fontWeight: 500 }}>
          {data.website.bizName || 'Your business'}
        </div>
        <h1
          style={{
            margin: '4px 0 0', fontSize: 28, fontWeight: 700,
            color: t.text, letterSpacing: -0.6,
          }}
        >
          Your site is being prepared
        </h1>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        <Card t={t}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <Badge t={t} tone="accent" dot>{planLabel}</Badge>
            <span style={{ fontSize: 13, color: t.textMuted }}>{primaryDomain}</span>
          </div>
          <div style={{ fontSize: 14, color: t.text, lineHeight: 1.55 }}>
            Thanks for signing up. Your account manager will reach out within one business day to
            kick off setup. You can edit your intake answers anytime from the link below.
          </div>
          <div style={{ marginTop: 12 }}>
            <Link
              href={`/business/setup?org_id=${data.orgId}&plan_code=${data.planCode}&org_name=${encodeURIComponent(data.website.bizName || '')}`}
              style={{ color: t.accent, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
            >
              Edit setup →
            </Link>
          </div>
        </Card>

        <Card t={t} padding={0}>
          <div style={{ padding: '4px 20px' }}>
            <SummaryRow t={t} label="Plan" value={planLabel} />
            <SummaryRow t={t} label="DNS management" value={
              data.dns.mode === 'jbp' ? 'Javelina managed' :
              data.dns.mode === 'self' ? `Self-managed${data.dns.provider ? ` · ${data.dns.provider}` : ''}` :
              'Skip — use Javelina subdomain'
            } />
            <SummaryRow t={t} label="Domain" value={primaryDomain} mono />
            <SummaryRow t={t} label="Aesthetic" value={
              data.website.aesthetic === 'bold' ? 'Bold & editorial' :
              data.website.aesthetic === 'simple' ? 'Simple & professional' : 'Custom'
            } />
            <SummaryRow t={t} label="Tone" value={data.website.tone || '—'} />
            <SummaryRow
              t={t}
              label="Contact"
              value={[data.contact.firstName, data.contact.lastName].filter(Boolean).join(' ') || '—'}
            />
          </div>
        </Card>

        <Card t={t}>
          <h2
            style={{
              margin: 0, fontSize: 13, fontWeight: 600,
              color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.6,
            }}
          >
            What happens next
          </h2>
          <ol
            style={{
              marginTop: 12, padding: '0 0 0 20px',
              color: t.text, fontSize: 14, lineHeight: 1.6,
            }}
          >
            <li>We provision your domain and SSL.</li>
            <li>Your managed website is built and deployed.</li>
            <li>{data.planCode === 'business_pro' ? 'Microsoft 365 mailboxes are created and credentials sent.' : 'Business email is set up.'}</li>
            <li>We notify you by email when everything is live.</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}

export default BusinessPlaceholderDashboard;
```

- [ ] **Step 4: Implement page with guard**

```tsx
// app/business/[orgId]/page.tsx
'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBusinessIntakeStore } from '@/lib/business-intake-store';
import { BusinessPlaceholderDashboard } from '@/components/business/dashboard/BusinessPlaceholderDashboard';

export default function BusinessOrgDashboardPage() {
  const router = useRouter();
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;
  const data = useBusinessIntakeStore((s) => (orgId ? s.intakes[orgId] : undefined));

  useEffect(() => {
    if (!orgId) return;
    if (!data || !data.completedAt) {
      router.replace(`/business/setup?org_id=${orgId}&plan_code=${data?.planCode ?? 'business_starter'}`);
    }
  }, [orgId, data, router]);

  if (!orgId || !data || !data.completedAt) return null;
  return <BusinessPlaceholderDashboard data={data} />;
}
```

- [ ] **Step 5: Run tests — expect pass**

Run: `npx vitest run tests/business/dashboard/BusinessPlaceholderDashboard.test.tsx` → PASS.

- [ ] **Step 6: Commit**

```bash
git add components/business/dashboard/BusinessPlaceholderDashboard.tsx app/business/[orgId]/page.tsx tests/business/dashboard/BusinessPlaceholderDashboard.test.tsx
git commit -m "feat(business): add placeholder dashboard + route guard"
```

---

## Task 18: Wire pricing → checkout with `intake=business`

**Files:**
- Modify: `app/pricing/PricingContent.tsx:105-132` (inside `handleOrgCreated`)

- [ ] **Step 1: Inspect current `handleOrgCreated`**

Read: `app/pricing/PricingContent.tsx:105-132`. Confirm it builds the checkout URL from `planConfig.code`, `priceId`, etc.

- [ ] **Step 2: Edit — append `intake=business` for business-line plans**

Change this block:

```tsx
router.push(
  `/checkout?org_id=${orgId}&plan_code=${planConfig.code}&price_id=${planConfig.monthly.priceId}&plan_name=${encodeURIComponent(planConfig.name)}&plan_price=${planConfig.monthly.amount}&billing_interval=${billingInterval}`
);
```

to:

```tsx
const intakeSuffix = planConfig.productLine === 'business' ? '&intake=business' : '';
const orgNameSuffix = planConfig.productLine === 'business'
  ? `&org_name=${encodeURIComponent(orgId)}` // org_id as a stable fallback; real name resolved later
  : '';
router.push(
  `/checkout?org_id=${orgId}&plan_code=${planConfig.code}&price_id=${planConfig.monthly.priceId}&plan_name=${encodeURIComponent(planConfig.name)}&plan_price=${planConfig.monthly.amount}&billing_interval=${billingInterval}${intakeSuffix}${orgNameSuffix}`
);
```

Note: we pass `org_name` through so the wizard can seed the intake without a separate API call. If `AddOrganizationModal` already has the name in scope, grab it from there instead — check `selectedPlanForOrg` and the modal's `onSuccess` signature. If the modal only returns `orgId`, leave the fallback as-is; the wizard's first field lets the user correct it.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit` → expect no new errors.

- [ ] **Step 4: Commit**

```bash
git add app/pricing/PricingContent.tsx
git commit -m "feat(business): thread intake=business param from pricing to checkout"
```

---

## Task 19: Pass `intake` through checkout + Stripe return URL

**Files:**
- Modify: `app/checkout/page.tsx` (interface + URL plumbing)
- Modify: `components/stripe/StripePaymentForm.tsx`

- [ ] **Step 1: Extend `CheckoutData` and parse `intake`**

In `app/checkout/page.tsx`, add `intake` to the `CheckoutData` interface and to the URL parser:

```tsx
interface CheckoutData {
  org_id: string;
  plan_code: string;
  price_id: string;
  plan_name?: string;
  plan_price?: number;
  billing_interval?: string;
  intake?: 'business' | null;
  org_name?: string;
  upgrade_type?: 'subscription-to-lifetime' | 'lifetime-to-lifetime' | null;
  original_price?: number;
  credit_amount?: number;
  from_plan_code?: string;
}
```

In the useEffect that parses `searchParams`, add:

```tsx
const intake = searchParams.get('intake') as 'business' | null;
const org_name = searchParams.get('org_name') || undefined;
// ...
const data: CheckoutData = {
  // existing fields...
  intake,
  org_name,
};
```

- [ ] **Step 2: Pass `intake` + `org_name` + `plan_code` to StripePaymentForm**

Where `<StripePaymentForm ... orgId={checkoutData.org_id} .../>` is rendered (around line 437), add:

```tsx
<StripePaymentForm
  onSuccess={handlePaymentSuccess}
  onError={handlePaymentError}
  orgId={checkoutData.org_id}
  flow={flow}
  intake={checkoutData.intake}
  planCode={checkoutData.plan_code}
  orgName={checkoutData.org_name}
/>
```

- [ ] **Step 3: Extend StripePaymentForm to include intake params in return URL**

In `components/stripe/StripePaymentForm.tsx`, extend the props and return-URL build:

```tsx
interface StripePaymentFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
  orgId?: string;
  flow?: 'payment_intent' | 'setup_intent';
  intake?: 'business' | null;
  planCode?: string;
  orgName?: string;
}

export function StripePaymentForm({
  onSuccess, onError, orgId, flow = 'payment_intent',
  intake, planCode, orgName,
}: StripePaymentFormProps) {
  // ... existing setup ...

  // Build return URL — keep current behavior for non-business plans.
  const params = new URLSearchParams();
  if (orgId) params.set('org_id', orgId);
  if (intake === 'business') {
    params.set('intake', 'business');
    if (planCode) params.set('plan_code', planCode);
    if (orgName) params.set('org_name', orgName);
  }
  const qs = params.toString();
  const returnUrl = `${window.location.origin}/stripe/success${qs ? `?${qs}` : ''}`;
  // ... rest unchanged
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit` → expect no errors.

- [ ] **Step 5: Commit**

```bash
git add app/checkout/page.tsx components/stripe/StripePaymentForm.tsx
git commit -m "feat(business): plumb intake param through checkout + Stripe return URL"
```

---

## Task 20: Divert `/stripe/success` for business intakes

**Files:**
- Modify: `app/stripe/success/page.tsx:66-76, 117-118`

- [ ] **Step 1: Change the redirect target**

In `app/stripe/success/page.tsx`, locate both spots that compute the redirect path (the `useEffect` at line 66–76 and the JSX at line 117–118). Replace each computation of `redirectPath` / `path` with a helper:

```tsx
const orgId = searchParams.get('org_id');
const intake = searchParams.get('intake');
const planCode = searchParams.get('plan_code');
const orgName = searchParams.get('org_name');

function resolveDestination(): string {
  if (intake === 'business' && orgId && planCode) {
    const qs = new URLSearchParams({ org_id: orgId, plan_code: planCode });
    if (orgName) qs.set('org_name', orgName);
    return `/business/setup?${qs.toString()}`;
  }
  return orgId ? `/organization/${orgId}` : '/';
}
```

Use `resolveDestination()` in the `router.push` on commit and in the "Go to Dashboard Now" button.

- [ ] **Step 2: Update toast copy for business intakes (cosmetic)**

In the post-commit toast:

```tsx
addToast('success', intake === 'business'
  ? 'Welcome to Javelina Business — let\'s set up your site.'
  : 'Welcome to your new plan!');
```

- [ ] **Step 3: Manual smoke test (DNS regression)**

1. `npm run dev`
2. Log in, go to `/pricing`, pick the **Starter** DNS plan (monthly).
3. Complete Stripe test checkout (`4242 4242 4242 4242`, any future date, any CVC).
4. Confirm final landing is `/organization/<id>` as before. **This must not regress.**

- [ ] **Step 4: Manual smoke test (business happy path)**

1. Same dev server, back to `/pricing`.
2. Pick **Javelina Business Starter**.
3. Create org in modal.
4. Complete Stripe test checkout.
5. Expected: `/stripe/success` briefly, then redirect to `/business/setup?org_id=...&plan_code=business_starter&...`.
6. Step through all five wizard steps; click **Launch my site**.
7. Expected: redirect to `/business/<orgId>`, placeholder dashboard shows bizName, plan badge, summary, next-steps.
8. Refresh the page: stays on dashboard (store persists).
9. Visit `/business/<orgId>` in a private window (different localStorage): redirects to `/business/setup?...` since no store record — acceptable for mock phase.

- [ ] **Step 5: Commit**

```bash
git add app/stripe/success/page.tsx
git commit -m "feat(business): redirect business intakes to wizard after payment"
```

---

## Task 21: Run full test suite + commit any fallout

- [ ] **Step 1: Run full Vitest suite**

Run: `npm test -- --run`
Expected: all tests pass (new business tests + existing suite). If any existing tests break, they were almost certainly relying on the Stripe `return_url` shape or on `/stripe/success` always redirecting to `/organization/...`. Fix tests to accept either outcome, not to pin the new behavior.

- [ ] **Step 2: Run type-check**

Run: `npx tsc --noEmit` → clean.

- [ ] **Step 3: Run lint (if configured)**

Run: `npm run lint` if present; fix any errors specific to new files.

- [ ] **Step 4: Final commit (if any fixes)**

```bash
git add -A
git commit -m "chore(business): fix tests and lint for intake flow"
```

---

## Self-review (author notes)

**Spec coverage:**
- §Visual system → Task 1 (tokens), Tasks 2–6 (primitives) ✓
- §Routing & branching → Tasks 18–20 ✓
- §New routes → Tasks 16–17 ✓
- §State → Task 7 ✓
- §Launch action → Task 15 (`onLaunch` in shell) ✓
- §Placeholder dashboard scope → Task 17 ✓
- §What is out of scope → nothing in this plan touches admin, full dashboard, M365, AI agent, real uploads, or backend ✓
- §Testing approach → each task has unit tests; Task 20 Steps 3–4 are the manual regression + happy path ✓

**Placeholder scan:** searched for "TBD", "TODO", "implement later", "handle edge cases", "similar to Task" — none present.

**Type consistency:** `BusinessIntakeData`, `BusinessPlanCode`, store method signatures (`init`, `update`, `setStep`, `complete`, `get`) stay consistent from Task 7 onward. `Tokens` type from Task 1 is imported verbatim by all primitives.

**Gaps considered & addressed:**
- Seeding `bizName` in the store: handled via `org_name` URL param threaded all the way through (Tasks 18–20) with a fallback to "My business".
- Dashboard guard bouncing infinitely if store empty: guard checks `!data || !data.completedAt`, redirects to setup; setup page `init`s the store if missing, preventing ping-pong.
- `BUSINESS_PLAN_FEATURES` duplication between `StepConfirm` and `lib/plans-config.ts`: called out inline with a comment; real de-dup is a follow-up once the plan feature accessor is shared.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-22-business-intake-flow.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
