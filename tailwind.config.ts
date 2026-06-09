import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Merit brand tokens (matching the existing Shopify theme)
        ink:        '#0B0F19',
        'ink-soft': '#4A5160',
        'ink-muted':'#94A0B0',
        cobalt:     '#2E4DDB',
        'cobalt-soft':'#6B8AFF',
        cream:      '#F4F1EA',
        border:     '#E2E5EB',
        'border-soft':'#EEF0F3',
        success:    '#1A8B3F',
        steel:      '#1E2330',
        star:       '#F0B040',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter-tight)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
      },
      maxWidth: {
        container: '1320px',
      },
    },
  },
  plugins: [],
};

export default config;
