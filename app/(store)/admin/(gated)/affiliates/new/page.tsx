import Link from 'next/link';
import { InviteAffiliateForm } from './InviteAffiliateForm';

export const metadata = { title: 'Invite affiliate — Merit Admin' };
export const dynamic = 'force-dynamic';

export default function InviteAffiliatePage() {
  return (
    <main className="max-w-[720px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <Link
        href="/admin/affiliates"
        className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3 inline-block hover:underline underline-offset-4"
      >
        ← Affiliates
      </Link>
      <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl mb-1">
        Invite affiliate<span className="text-cobalt">.</span>
      </h1>
      <p className="text-sm text-ink-soft leading-relaxed max-w-xl mb-8">
        Creates an <strong className="text-ink">active</strong> affiliate directly — same setup as
        the public sign-up. Their code works at checkout immediately; the invite email carries their
        referral link, code, and a one-click sign-in to the dashboard.
      </p>
      <InviteAffiliateForm />
    </main>
  );
}
