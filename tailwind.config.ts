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
        // Was #F4F1EA — a warm, artisanal cream. It read apothecary and
        // softened a brand whose entire claim is pharmacy rigor, and it
        // clashed with the cool hero once that was rebuilt. Cooled to a
        // near-white that still separates from pure white on section
        // alternation. One token: reverting is one line.
        cream:      '#F5F6F8',
        // Supply-line (medical device) neutrals. Deliberately COOL: the
        // storefront's warm cream reads apothecary, and the register for a
        // device supplier is clinical — near-white paper, hairline rules.
        paper:      '#F6F7F9',
        line:       '#E4E7EC',
        'line-soft':'#EFF1F4',
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
        // Poster face — 800/900 only, for the homepage's stacked caps.
        poster: ['var(--font-archivo)', 'var(--font-inter-tight)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        container: '1320px',
      },
    },
  },
  plugins: [],
};

export default config;
