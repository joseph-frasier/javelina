import type { Config } from 'tailwindcss';
import { fontFamily } from 'tailwindcss/defaultTheme';

const config: Config = {
  darkMode: ['class', '.theme-dark'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ─── Javelina brand orange (accent) ─────────────────────
        // Legacy tokens (orange.DEFAULT/light/dark) retained so existing
        // consumers keep compiling while Phase 2 restyles them.
        orange: {
          DEFAULT: '#EF7215',
          50: '#FFF3E8',
          100: '#FFE2C8',
          200: '#FFC590',
          300: '#FFA758',
          400: '#FF8C3D',
          500: '#EF7215',
          600: '#D8640F',
          700: '#B4500A',
          800: '#7A3607',
          900: '#3F1C03',
          light: '#F2F2F2', // legacy
          dark: '#0B0C0D',  // legacy
        },
        // Semantic tokens
        success: {
          DEFAULT: '#059669',
          soft: 'rgba(5,150,105,0.10)',
        },
        warning: {
          DEFAULT: '#D97706',
          soft: 'rgba(217,119,6,0.12)',
        },
        danger: {
          DEFAULT: '#DC2626',
          soft: 'rgba(220,38,38,0.10)',
        },
        info: {
          DEFAULT: '#0284C7',
          soft: 'rgba(2,132,199,0.10)',
        },
        // Surface / border / text tokens bound to CSS vars (see globals.css).
        surface: {
          DEFAULT: 'var(--surface)',
          alt: 'var(--surface-alt)',
          hover: 'var(--surface-hover)',
        },
        border: {
          DEFAULT: 'var(--border-color)',
          strong: 'var(--border-strong)',
        },
        text: {
          DEFAULT: 'var(--text-primary)',
          muted: 'var(--text-muted)',
          faint: 'var(--text-faint)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          soft: 'var(--accent-soft)',
          'soft-strong': 'var(--accent-soft-strong)',
        },
        // Legacy palette (kept for back-compat)
        gray: {
          light: '#D9D9D9',
          slate: '#456173',
        },
        blue: {
          electric: '#00B0FF',
          teal: '#00796B',
        },
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      fontFamily: {
        // Populated by next/font/google in app/layout.tsx via CSS variables.
        sans: ['var(--font-sans)', 'Inter', ...fontFamily.sans],
        mono: ['var(--font-mono)', 'JetBrains Mono', ...fontFamily.mono],
        condensed: ['Roboto Condensed', 'sans-serif'], // legacy
      },
      fontWeight: {
        light: '300',
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        black: '900',
      },
      spacing: {
        18: '4.5rem',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        card: 'var(--shadow-sm)',
        elevated: 'var(--shadow-md)',
        popover: 'var(--shadow-lg)',
        'focus-ring': '0 0 0 3px var(--ring)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        popPulse: {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '100%': { transform: 'scale(2.8)', opacity: '0' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-in',
        pulse: 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        popPulse: 'popPulse 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
