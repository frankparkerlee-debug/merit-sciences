import type { Metadata, Viewport } from 'next';
import { PeptideTycoon } from './PeptideTycoon';

// Mobile-browser game — no app store needed. This viewport keeps it locked to
// a comfortable phone layout (no accidental pinch-zoom mid-tap) while staying
// responsive up to desktop.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
    <div className="bg-[#FAFAF8] min-h-screen">
      <PeptideTycoon />
    </div>
  );
}
