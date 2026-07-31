import { BackfillButton } from './BackfillButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Backfill commissions — Admin' };

export default function BackfillCommissionsPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cobalt">— One-off maintenance</p>
      <h1 className="mt-1 font-display text-2xl font-black tracking-tight text-ink">
        Backfill affiliate commissions
      </h1>

      <div className="mt-5 space-y-4 text-sm leading-relaxed text-ink-soft">
        <p>
          Creates the commission rows that were <strong>never written</strong> for past orders attributed
          to an affiliate. This was the card-flow gap: PayPal omits the buyer email on
          Advanced Card Field captures, so the webhook bailed before writing the commission —
          meaning card-paid referrals earned nothing and didn&rsquo;t appear on the affiliate
          dashboard.
        </p>
        <p>It mirrors the live webhook exactly:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Commissionable base = order subtotal minus discount (shipping excluded).</li>
          <li>Rate = the affiliate&rsquo;s trailing-30-day tier as of each order&rsquo;s date.</li>
          <li>Self-purchases get a <strong>$0</strong> row (visible, no commission), per the program rules.</li>
          <li>Orders that already have a commission are skipped — <strong>safe to run more than once.</strong></li>
        </ul>
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          New rows are created as <strong>PENDING</strong>, exactly like a fresh commission — they flow
          through your normal payout review before anyone is paid.
        </p>
      </div>

      <div className="mt-7">
        <BackfillButton />
      </div>
    </main>
  );
}
