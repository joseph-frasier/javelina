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
        // Brand Primary Palette
        orange: {
          DEFAULT: '#EF7215', // Vibrant Orange (Main)
          light: '#F2F2F2', // Light Gray Accent
          dark: '#0B0C0D', // Charcoal Black
        },
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
        sans: ['Roboto', ...fontFamily.sans],
        condensed: ['Roboto Condensed', 'sans-serif'],
      },
      fontWeight: {
        light: '300',
        regular: '400',
        medium: '500',
        bold: '700',
        black: '900',
      },
      spacing: {
        18: '4.5rem',
      },
      borderRadius: {
        xl: '1rem',
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
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-in',
        pulse: 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
