import { TEMPLATES } from './sample-data';
import { SendTestButton } from './SendTestButton';
import { renderTemplate } from './actions';

export const metadata = { title: 'Email previews — Merit Admin' };
export const dynamic = 'force-dynamic';

export default function EmailPreviewsPage() {
  const transactional = TEMPLATES.filter((t) => t.group === 'transactional');
  const marketing = TEMPLATES.filter((t) => t.group === 'marketing');

  return (
    <main className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Email previews</p>
        <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl sm:text-4xl">
          {TEMPLATES.length} templates<span className="text-cobalt">.</span>
        </h1>
        <p className="text-sm text-ink-soft mt-2 leading-relaxed max-w-2xl">
          All templates render with sample data &mdash; real customer info is never used in previews.
          Click <strong>&quot;Send test to me&quot;</strong> on any template to fire a real Resend send to your operator inbox.
          Use this loop to iterate on copy + design without doing full test orders.
        </p>
      </div>

      {/* Transactional group */}
      <Section title="Transactional" subtitle="Auto-sent during the order lifecycle. Customer always gets these.">
        <Grid templates={transactional} />
      </Section>

      {/* Marketing group */}
      <Section title="Marketing" subtitle="Manual or scheduled outreach. Triggers wired in follow-up pushes.">
        <Grid templates={marketing} />
      </Section>
    </main>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <div className="border-b border-cobalt/10 pb-3 mb-5">
        <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">— {title}</p>
        <p className="text-xs text-ink-soft mt-1">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Grid({ templates }: { templates: typeof TEMPLATES }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {templates.map((t) => {
        const rendered = renderTemplate(t.key);
        return (
          <article
            key={t.key}
            className="rounded-2xl border border-cobalt/15 bg-white overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-3 border-b border-cobalt/10 flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display font-black text-ink tracking-tight text-base truncate">
                  {t.label}
                </h3>
                <p className="text-[11px] text-ink-soft mt-0.5 truncate">{t.description}</p>
              </div>
              <SendTestButton templateKey={t.key} />
            </div>

            {/* Subject preview */}
            <div className="px-5 py-2 bg-cobalt/[0.03] border-b border-cobalt/10">
              <p className="text-[10px] tracking-[0.14em] uppercase font-bold text-ink-soft mb-0.5">Subject</p>
              <p className="text-xs text-ink truncate font-mono">{rendered?.subject || '—'}</p>
            </div>

            {/* Iframe preview */}
            <div className="bg-cream/40 flex-1 min-h-[480px]">
              <iframe
                src={`/admin/email-previews/render/${t.key}`}
                title={`${t.label} preview`}
                className="w-full h-[480px] border-0 bg-white"
                sandbox="allow-same-origin"
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
