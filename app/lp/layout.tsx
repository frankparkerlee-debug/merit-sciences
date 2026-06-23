import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Landing pages for paid traffic — no nav, no footer, no cart, no popup.
// The RUO banner in root layout still renders (lives outside this subtree).
export default function LpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
