import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentAffiliate } from '@/lib/affiliate-session';
import { CopyBlock } from './CopyBlock';

export const metadata = { title: 'Promotion Kit — Merit Sciences Affiliate' };
export const dynamic = 'force-dynamic';

export default async function KitPage() {
  const affiliate = await getCurrentAffiliate();
  if (!affiliate) redirect('/affiliate/login?next=/affiliate/dashboard/kit');

  const code = affiliate.discountCode.toUpperCase();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com';
  const link = `${siteUrl}/?ref=${affiliate.slug}`;

  // Captions are pre-filled with the affiliate's real code. All brand + savings,
  // zero molecule names, zero health/results claims — the framing we locked.
  const captions: { platform: string; text: string }[] = [
    {
      platform: 'Instagram / general',
      text: `People ask what I actually trust — and Merit Sciences earns it. A real pharmacy, third-party tested, with a COA on every batch you can look up yourself. If you've wanted a source you can verify, this is it.\n\nCode ${code} = 10% off your first order. #ad #meritpartner`,
    },
    {
      platform: 'Story / quick',
      text: `My code ${code} = 10% off Merit Sciences 👀 Pharmacy-grade, third-party tested, ships fast. Link in bio. #ad`,
    },
    {
      platform: 'TikTok / Reels caption',
      text: `Why I point people to Merit Sciences: they show the receipts — third-party tested, a COA on every batch, no mystery. Code ${code} for 10% off. #ad #partner`,
    },
    {
      platform: 'Bio / link-in-bio line',
      text: `Merit Sciences — pharmacy-grade & third-party tested. 10% off with ${code}. #ad`,
    },
    {
      platform: 'Newsletter / longer',
      text: `I get asked all the time where to find a source you can trust. My answer is Merit Sciences — a real pharmacy, every batch third-party HPLC tested with a COA you can look up, shipped from Texas in days. As a partner I've got a code for you: ${code} takes 10% off your first order.\n\n(Paid partnership — I only work with brands I actually stand behind.)`,
    },
  ];

  return (
    <main className="bg-cream min-h-screen pb-24">
      {/* Header */}
      <div className="border-b border-cobalt/10 bg-white">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-1">— Promotion kit</p>
            <h1 className="font-display font-black text-ink tracking-[-0.025em] text-2xl sm:text-3xl">
              Post with confidence<span className="text-cobalt">.</span>
            </h1>
          </div>
          <Link
            href="/affiliate/dashboard"
            className="text-xs font-bold tracking-wider uppercase text-ink-soft hover:text-ink transition"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      <section className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 pt-10 space-y-10">
        <p className="text-base text-ink-soft leading-relaxed max-w-2xl">
          Everything you need to promote Merit — the right way. Stick to this and your posts stay live,
          your account stays safe, and you stay paid. The golden rule:{' '}
          <strong className="text-ink">
            you share the brand and your code. We handle the product, the science, and the claims.
          </strong>
        </p>

        {/* Your code + link */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-cobalt/15 bg-white p-5">
            <p className="text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold mb-2">Your code</p>
            <code className="text-2xl font-black text-ink tracking-tight">{code}</code>
            <p className="text-xs text-ink-soft mt-2">Your audience saves 10% — you earn on every order.</p>
          </div>
          <div className="rounded-2xl border border-cobalt/15 bg-white p-5">
            <p className="text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold mb-2">Your link</p>
            <code className="text-sm font-bold text-ink break-all">{link}</code>
            <p className="text-xs text-ink-soft mt-2">Sets a 30-day cookie; the first purchase locks that customer to you forever.</p>
          </div>
        </div>

        {/* 01 — Golden rules */}
        <div>
          <SectionHead n="01" title="The golden rules" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6">
              <p className="text-[11px] tracking-[0.18em] uppercase text-emerald-800 font-bold mb-4">✓ Do</p>
              <ul className="space-y-3 text-sm text-ink leading-snug">
                <Li>Tag <strong>Merit Sciences</strong> and share <strong>your code</strong>.</Li>
                <Li>Talk about <strong>trust, transparency, third-party testing, COAs, fast shipping</strong>, and the 10% your audience saves.</Li>
                <Li>Share your honest take on the <strong>brand</strong> — reliable, verifiable, fast.</Li>
                <Li>Always disclose the partnership with <strong>#ad</strong> (see below).</Li>
                <Li>Use the approved captions and assets here.</Li>
              </ul>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6">
              <p className="text-[11px] tracking-[0.18em] uppercase text-rose-800 font-bold mb-4">✕ Never</p>
              <ul className="space-y-3 text-sm text-ink leading-snug">
                <Li>Name specific compounds or molecules, or what they&rsquo;re &ldquo;for.&rdquo;</Li>
                <Li>Make health, weight-loss, medical, or results claims (&ldquo;I lost…&rdquo;, &ldquo;this fixes…&rdquo;, &ldquo;cures/treats&rdquo;).</Li>
                <Li>Show needles, injections, vials, or before/afters.</Li>
                <Li>Give dosing or any medical advice.</Li>
                <Li>Run your own paid ads about the products — <strong>talk to us first</strong>.</Li>
              </ul>
            </div>
          </div>
        </div>

        {/* FTC disclosure */}
        <div className="rounded-2xl border border-cobalt/20 bg-cobalt/5 p-6">
          <p className="text-[10px] tracking-[0.18em] uppercase text-cobalt font-bold mb-2">Required — FTC disclosure</p>
          <h3 className="font-display text-lg font-extrabold text-ink mb-2">Always say it&rsquo;s a paid partnership.</h3>
          <p className="text-sm text-ink-soft leading-relaxed">
            Put <strong className="text-ink">#ad</strong> or <strong className="text-ink">#sponsored</strong> somewhere
            people will actually see it — not buried at the end of 30 hashtags. Use the platform&rsquo;s built-in
            &ldquo;Paid partnership&rdquo; label whenever it&rsquo;s available. This protects you and us.
          </p>
        </div>

        {/* 02 — Captions */}
        <div>
          <SectionHead
            n="02"
            title="Approved captions"
            sub="Copy-paste ready, your code already in them. Make the voice sound like you — just keep the rules above."
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {captions.map((c) => (
              <CopyBlock key={c.platform} platform={c.platform} text={c.text} />
            ))}
          </div>
        </div>

        {/* 03 — Assets */}
        <div>
          <SectionHead
            n="03"
            title="Brand assets"
            sub="Logos, on-brand backgrounds, and story templates — no product imagery, all cleared for social."
          />
          <div className="rounded-2xl border border-cobalt/15 bg-white p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <p className="text-sm text-ink-soft leading-relaxed max-w-xl">
              Want the full pack — logo files, cobalt backgrounds, and ready-to-post story templates? We&rsquo;ll send it over.
            </p>
            <a
              href={`mailto:info@meritpeptides.com?subject=${encodeURIComponent(`Asset pack for ${code}`)}`}
              className="inline-flex flex-none items-center gap-2 bg-cobalt text-white px-5 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition"
            >
              Request your asset pack →
            </a>
          </div>
        </div>

        <div className="pt-2">
          <Link href="/affiliate/dashboard" className="text-cobalt font-bold hover:underline text-sm">
            ← Back to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}

function SectionHead({ n, title, sub }: { n: string; title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-baseline gap-3">
        <span className="font-display font-black text-cobalt/30 text-2xl tabular-nums">{n}</span>
        <h2 className="font-display font-black text-ink tracking-tight text-xl sm:text-2xl">
          {title}<span className="text-cobalt">.</span>
        </h2>
      </div>
      {sub && <p className="text-sm text-ink-soft mt-2 max-w-2xl leading-relaxed">{sub}</p>}
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="flex-none text-ink-muted">—</span>
      <span>{children}</span>
    </li>
  );
}
