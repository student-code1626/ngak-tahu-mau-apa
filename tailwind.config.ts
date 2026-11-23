import type { Config } from 'tailwindcss';

const config: Config = {
  prefix: 'tw-',
  corePlugins: {
    preflight: false,
  },
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        page: 'var(--page)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'surface-soft': 'var(--surface-soft)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        'muted-2': 'var(--muted-2)',
        brand: {
          DEFAULT: 'var(--green)',
          dark: 'var(--green-dark)',
          soft: 'var(--green-soft)',
          pale: 'var(--green-pale)',
        },
        pos: {
          saving: 'var(--pos-saving)',
          'saving-soft': 'var(--pos-saving-soft)',
          living: 'var(--pos-living)',
          'living-soft': 'var(--pos-living-soft)',
          'living-text': 'var(--pos-living-text)',
          playing: 'var(--pos-playing)',
          'playing-soft': 'var(--pos-playing-soft)',
          'playing-text': 'var(--pos-playing-text)',
        },
        accent: {
          coral: 'var(--coral)',
          'coral-soft': 'var(--coral-soft)',
          red: 'var(--red)',
          'red-soft': 'var(--red-soft)',
        },
        layer: {
          month: 'var(--layer-month-bg)',
          'month-border': 'var(--layer-month-border)',
          stored: 'var(--layer-stored-bg)',
          'stored-border': 'var(--layer-stored-border)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Manrope', 'sans-serif'],
        body: ['var(--font-body)', 'DM Sans', 'sans-serif'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        lg: '22px',
      },
      boxShadow: {
        DEFAULT: 'var(--shadow)',
        lg: 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
};

export default config;

