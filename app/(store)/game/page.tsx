import type { Metadata, Viewport } from 'next';
import { Press_Start_2P } from 'next/font/google';
import { PeptideTycoon } from './PeptideTycoon';

// Retro pixel display font — scoped to the game route via the CSS variable on
// the wrapper below, so the storefront's typography is untouched.
const pressStart = Press_Start_2P({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-pixel',
  display: 'swap',
});

// Mobile-browser game — no app store needed. We deliberately DON'T set
// maximumScale/user-scalable (that breaks pinch-zoom + fails WCAG); rapid-tap
// double-tap-zoom is instead suppressed via `touch-manipulation` on buttons.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2E4DDB',
};

export const metadata: Metadata = {
  title: 'Peptide Tycoon — the Merit idle game',
  description:
    'Build a peptide lab, collect 16 absurd hero mascots (meet Retatouille 🐀💪), and level them up to unlock real discounts on Merit compounds. A free browser game — no download.',
  alternates: { canonical: '/game' },
  openGraph: {
    title: 'Peptide Tycoon — collect the heroes, unlock the discounts',
    description:
      'Idle your way to a fully-stocked peptide lab. Collect Retatouille, Tirzilla, Wolverine & more — level them up for real Merit discount codes.',
    url: 'https://meritsciences.com/game',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Peptide Tycoon — the Merit idle game',
    description:
      'Collect 16 peptide hero mascots and unlock real discounts. Play free in your browser 🧪',
  },
};

export default function GamePage() {
  return (
    <div className={`${pressStart.variable} game-bg min-h-screen`}>
      <PeptideTycoon />
    </div>
  );
}
