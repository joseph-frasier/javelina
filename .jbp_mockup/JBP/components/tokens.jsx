// Design tokens + shared primitives for JBP screens.
// Clean SaaS aesthetic. Light/dark + accent color are tweakable.

// Defaults, editable via the Tweaks protocol.
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "sky",
  "dark": false
}/*EDITMODE-END*/;

const ACCENTS = {
  sky:     { 500: '#0284c7', 600: '#0369a1', 50: '#f0f9ff', 100: '#e0f2fe', ring: 'rgba(2,132,199,0.18)' },
  indigo:  { 500: '#4f46e5', 600: '#4338ca', 50: '#eef2ff', 100: '#e0e7ff', ring: 'rgba(79,70,229,0.18)' },
  emerald: { 500: '#059669', 600: '#047857', 50: '#ecfdf5', 100: '#d1fae5', ring: 'rgba(5,150,105,0.18)' },
  violet:  { 500: '#7c3aed', 600: '#6d28d9', 50: '#f5f3ff', 100: '#ede9fe', ring: 'rgba(124,58,237,0.18)' },
  amber:   { 500: '#d97706', 600: '#b45309', 50: '#fffbeb', 100: '#fef3c7', ring: 'rgba(217,119,6,0.18)' },
  rose:    { 500: '#e11d48', 600: '#be123c', 50: '#fff1f2', 100: '#ffe4e6', ring: 'rgba(225,29,72,0.18)' },
};

function themeTokens(accentKey, dark) {
  const a = ACCENTS[accentKey] || ACCENTS.sky;
  if (dark) {
    return {
      bg: '#0b0d10',
      surface: '#14181d',
      surfaceAlt: '#181d23',
      surfaceHover: '#1d242b',
      border: '#232a32',
      borderStrong: '#303944',
      text: '#eef2f7',
      textMuted: '#9aa4b2',
      textFaint: '#6b7684',
      accent: a[500],
      accentHover: a[600],
      accentSoft: 'rgba(255,255,255,0.04)',
      accentSoftStrong: 'rgba(255,255,255,0.08)',
      ring: a.ring,
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      shadowSm: '0 1px 2px rgba(0,0,0,0.3)',
      shadowMd: '0 8px 24px rgba(0,0,0,0.35)',
      shadowLg: '0 24px 60px rgba(0,0,0,0.5)',
    };
  }
  return {
    bg: '#f7f8fa',
    surface: '#ffffff',
    surfaceAlt: '#fafbfc',
    surfaceHover: '#f4f5f7',
    border: '#e6e8ec',
    borderStrong: '#d3d7de',
    text: '#0f1419',
    textMuted: '#566271',
    textFaint: '#8a94a3',
    accent: a[500],
    accentHover: a[600],
    accentSoft: a[50],
    accentSoftStrong: a[100],
    ring: a.ring,
    success: '#059669',
    warning: '#d97706',
    danger: '#dc2626',
    shadowSm: '0 1px 2px rgba(15,20,25,0.04), 0 1px 2px rgba(15,20,25,0.06)',
    shadowMd: '0 4px 12px rgba(15,20,25,0.06), 0 12px 32px rgba(15,20,25,0.06)',
    shadowLg: '0 24px 60px rgba(15,20,25,0.12), 0 2px 8px rgba(15,20,25,0.06)',
  };
}

const FONT = '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

// ── Primitives ──────────────────────────────────────────────

function Logo({ t, size = 14 }) {
  // Original mark: a diamond wrapped in a rounded square. No branded assets.
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: size + 10, height: size + 10, borderRadius: 7,
        background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)',
      }}>
        <div style={{
          width: size - 2, height: size - 2, background: '#fff',
          transform: 'rotate(45deg)', borderRadius: 2, opacity: 0.95,
        }} />
      </div>
      <span style={{ fontFamily: FONT, fontWeight: 700, color: t.text, fontSize: 15, letterSpacing: -0.2 }}>JBP</span>
    </div>
  );
}

function Button({ t, variant = 'primary', size = 'md', children, onClick, disabled, style, iconRight, iconLeft }) {
  const sizes = {
    sm: { h: 30, px: 12, fs: 13 },
    md: { h: 38, px: 16, fs: 14 },
    lg: { h: 44, px: 20, fs: 15 },
  }[size];
  const variants = {
    primary: {
      background: disabled ? t.borderStrong : t.accent,
      color: '#fff',
      border: '1px solid transparent',
      boxShadow: disabled ? 'none' : `0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.15)`,
    },
    secondary: {
      background: t.surface,
      color: t.text,
      border: `1px solid ${t.border}`,
      boxShadow: t.shadowSm,
    },
    ghost: {
      background: 'transparent',
      color: t.text,
      border: '1px solid transparent',
    },
    link: {
      background: 'transparent',
      color: t.accent,
      border: 'none',
      padding: 0,
      height: 'auto',
    },
  }[variant];
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        height: variant === 'link' ? 'auto' : sizes.h,
        padding: variant === 'link' ? 0 : `0 ${sizes.px}px`,
        fontSize: sizes.fs, fontWeight: 550, fontFamily: FONT,
        borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
        transition: 'background .12s, box-shadow .12s, transform .05s',
        letterSpacing: -0.1,
        ...variants,
        ...style,
      }}
      onMouseDown={e => !disabled && variant !== 'link' && (e.currentTarget.style.transform = 'translateY(0.5px)')}
      onMouseUp={e => (e.currentTarget.style.transform = 'translateY(0)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}

function Input({ t, value, onChange, placeholder, prefix, suffix, style, type = 'text', readOnly }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', height: 40, borderRadius: 8,
      background: readOnly ? t.surfaceAlt : t.surface,
      border: `1px solid ${focus ? t.accent : t.border}`,
      boxShadow: focus ? `0 0 0 3px ${t.ring}` : t.shadowSm,
      transition: 'border-color .12s, box-shadow .12s',
      fontFamily: FONT, overflow: 'hidden', ...style,
    }}>
      {prefix != null && (
        <div style={{
          display: 'flex', alignItems: 'center', padding: '0 10px 0 12px',
          color: t.textMuted, fontSize: 13, borderRight: `1px solid ${t.border}`,
          background: t.surfaceAlt,
        }}>{prefix}</div>
      )}
      <input
        type={type}
        value={value ?? ''}
        readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={placeholder}
        style={{
          flex: 1, border: 'none', outline: 'none', padding: '0 12px',
          background: 'transparent', color: t.text, fontSize: 14, fontFamily: FONT,
        }}
      />
      {suffix != null && (
        <div style={{
          display: 'flex', alignItems: 'center', padding: '0 12px',
          color: t.textMuted, fontSize: 13, borderLeft: `1px solid ${t.border}`,
          background: t.surfaceAlt,
        }}>{suffix}</div>
      )}
    </div>
  );
}

function Card({ t, children, style, padding = 24 }) {
  return (
    <div style={{
      background: t.surface, border: `1px solid ${t.border}`,
      borderRadius: 14, boxShadow: t.shadowSm, padding,
      ...style,
    }}>{children}</div>
  );
}

function Badge({ t, tone = 'neutral', children, dot }) {
  const tones = {
    neutral: { bg: t.surfaceAlt, fg: t.textMuted, dc: t.textFaint },
    success: { bg: 'rgba(5,150,105,0.1)', fg: t.success, dc: t.success },
    warning: { bg: 'rgba(217,119,6,0.12)', fg: t.warning, dc: t.warning },
    danger:  { bg: 'rgba(220,38,38,0.1)', fg: t.danger, dc: t.danger },
    accent:  { bg: t.accentSoft, fg: t.accent, dc: t.accent },
  }[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 9px', borderRadius: 999, fontSize: 12, fontWeight: 550,
      background: tones.bg, color: tones.fg, fontFamily: FONT, lineHeight: 1.3,
      border: `1px solid ${t.border}`,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: tones.dc }} />}
      {children}
    </span>
  );
}

function Toggle({ t, checked, onChange }) {
  return (
    <button
      onClick={() => onChange?.(!checked)}
      style={{
        width: 40, height: 24, borderRadius: 999, padding: 2, border: 'none', cursor: 'pointer',
        background: checked ? t.accent : t.borderStrong,
        transition: 'background .15s', display: 'flex', alignItems: 'center',
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: 999, background: '#fff',
        transform: `translateX(${checked ? 16 : 0}px)`,
        transition: 'transform .18s cubic-bezier(.3,.6,.3,1)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

// Tiny stroke icons — reusable SVG wrapper
function Icon({ name, size = 16, color = 'currentColor', style }) {
  const paths = {
    check: <polyline points="3,8 7,12 13,4" />,
    arrowRight: <g><line x1="3" y1="8" x2="13" y2="8" /><polyline points="9,4 13,8 9,12" /></g>,
    arrowLeft: <g><line x1="3" y1="8" x2="13" y2="8" /><polyline points="7,4 3,8 7,12" /></g>,
    plus: <g><line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" /></g>,
    external: <g><polyline points="10,3 13,3 13,6" /><line x1="13" y1="3" x2="8" y2="8" /><path d="M11 9v3H3V4h3" /></g>,
    globe: <g><circle cx="8" cy="8" r="5.5" /><line x1="2.5" y1="8" x2="13.5" y2="8" /><path d="M8 2.5c1.7 2 1.7 9 0 11M8 2.5c-1.7 2 -1.7 9 0 11" /></g>,
    server: <g><rect x="2.5" y="3" width="11" height="4" rx="1" /><rect x="2.5" y="9" width="11" height="4" rx="1" /><line x1="5" y1="5" x2="5" y2="5" /><line x1="5" y1="11" x2="5" y2="11" /></g>,
    shield: <path d="M8 2L3 4v4c0 3 2.5 5 5 6c2.5-1 5-3 5-6V4L8 2Z" />,
    chart: <g><polyline points="2,12 6,8 9,10 14,4" /><line x1="2" y1="13.5" x2="14" y2="13.5" /></g>,
    credit: <g><rect x="2" y="4" width="12" height="9" rx="1.5" /><line x1="2" y1="7" x2="14" y2="7" /></g>,
    edit: <g><path d="M11 3l2 2l-8 8H3v-2z" /></g>,
    dots: <g><circle cx="4" cy="8" r="0.8" fill={color} /><circle cx="8" cy="8" r="0.8" fill={color} /><circle cx="12" cy="8" r="0.8" fill={color} /></g>,
    search: <g><circle cx="7" cy="7" r="4" /><line x1="10" y1="10" x2="13.5" y2="13.5" /></g>,
    copy: <g><rect x="5" y="5" width="8" height="8" rx="1.5" /><path d="M3 11V4a1 1 0 011-1h7" /></g>,
    bell: <g><path d="M4 11V7a4 4 0 018 0v4l1 1H3z" /><path d="M7 13.5a1.5 1.5 0 003 0" /></g>,
    sparkle: <g><path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2" /></g>,
    x: <g><line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" /></g>,
    info: <g><circle cx="8" cy="8" r="6" /><line x1="8" y1="7" x2="8" y2="11" /><circle cx="8" cy="5" r="0.5" fill={color} /></g>,
    lock: <g><rect x="4" y="7" width="8" height="6" rx="1" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" /></g>,
    rocket: <g><path d="M9 3c3 0 4 1 4 4c0 0-2 1-2 3l-2 2l-3-3l2-2c2 0 3-2 3-2zM6 10l-2 2l1 1l2-2" /></g>,
    refresh: <g><path d="M3 8a5 5 0 018.5-3.5L13 6M13 3v3h-3" /><path d="M13 8a5 5 0 01-8.5 3.5L3 10M3 13v-3h3" /></g>,
    activity: <polyline points="2,8 5,8 7,3 10,13 12,8 14,8" />,
    users: <g><circle cx="6" cy="6" r="2.5" /><path d="M2 13c0-2 2-3.5 4-3.5s4 1.5 4 3.5" /><circle cx="11" cy="6" r="2" /><path d="M10 9.5c2 0 4 1 4 3" /></g>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}>
      {paths[name]}
    </svg>
  );
}

function Radio({ t, checked, onChange, label, description, icon }) {
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
      }}>
      <div style={{
        width: 18, height: 18, borderRadius: 999, marginTop: 2,
        border: `1.5px solid ${checked ? t.accent : t.borderStrong}`,
        background: checked ? t.accent : t.surface,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {checked && <div style={{ width: 6, height: 6, borderRadius: 999, background: '#fff' }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon && <div style={{ color: checked ? t.accent : t.textMuted }}>{icon}</div>}
          <div style={{ fontWeight: 600, color: t.text, fontSize: 14, fontFamily: FONT }}>{label}</div>
        </div>
        {description && (
          <div style={{ marginTop: 4, fontSize: 13, color: t.textMuted, fontFamily: FONT, lineHeight: 1.5 }}>
            {description}
          </div>
        )}
      </div>
    </label>
  );
}

function Checkbox({ t, checked, onChange, label, description }) {
  return (
    <label onClick={() => onChange?.(!checked)} style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '4px 0',
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: 5, marginTop: 1,
        border: `1.5px solid ${checked ? t.accent : t.borderStrong}`,
        background: checked ? t.accent : t.surface,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .12s', flexShrink: 0,
      }}>
        {checked && <Icon name="check" size={12} color="#fff" />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: t.text, fontFamily: FONT, fontWeight: 500 }}>{label}</div>
        {description && <div style={{ fontSize: 13, color: t.textMuted, marginTop: 2, fontFamily: FONT }}>{description}</div>}
      </div>
    </label>
  );
}

Object.assign(window, {
  TWEAK_DEFAULTS, ACCENTS, themeTokens, FONT, MONO,
  Logo, Button, Input, Card, Badge, Toggle, Icon, Radio, Checkbox,
});
