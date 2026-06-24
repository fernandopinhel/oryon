import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design tokens do Oryon
        primary: {
          DEFAULT: '#6366f1', // indigo-500
          foreground: '#ffffff',
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        surface: {
          DEFAULT: 'var(--c-surface)',
          secondary: 'var(--c-surface-secondary)',
          border: 'var(--c-surface-border)',
        },
        muted: {
          DEFAULT: 'var(--c-muted)',
          foreground: 'var(--c-muted-fg)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
      },
      screens: {
        xs: '480px',
      },
    },
  },
  plugins: [],
} satisfies Config
