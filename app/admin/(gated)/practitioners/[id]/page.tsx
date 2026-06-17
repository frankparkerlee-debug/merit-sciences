import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ReviewActions } from './ReviewActions';

export const metadata = { title: 'Application — Merit Admin' };
export const dynamic = 'force-dynamic';

export default async function PractitionerApplicationDetail({
  params,
}: {
  params: { id: string };
}) {
  const app = await prisma.practitionerApplication.findUnique({
    where: { id: params.id },
  });
  if (!app) return notFound();

  return (
    <main className="max-w-[960px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <Link
        href="/admin/practitioners"
        className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3 inline-block hover:underline underline-offset-4"
      >
        ← All applications
      </Link>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl mb-1">
            {app.practiceName}
            <span className="text-cobalt">.</span>
          </h1>
          <p className="text-sm text-ink-soft">
            {app.providerName}, {app.credentials} · NPI {app.npi}
          </p>
        </div>
        <StatusPill status={app.status} />
      </div>

      {/* Application details */}
      <section className="rounded-2xl border border-cobalt/15 bg-white p-6 mb-6">
        <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-4">
          — Application
        </p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <Row label="Email">
            <a href={`mailto:${app.email}`} className="text-cobalt hover:underline">
              {app.email}
            </a>
          </Row>
          <Row label="Phone">{app.phone || '—'}</Row>
          <Row label="State / License">
            {app.state} · {app.licenseNumber}
          </Row>
          <Row label="Specialty">{app.specialty || '—'}</Row>
          <Row label="Est. monthly volume">{app.monthlyVolume || '—'}</Row>
          <Row label="Submitted">
            {app.createdAt.toISOString().replace('T', ' ').slice(0, 16)}
          </Row>
          {app.notes && (
            <div className="col-span-full">
              <Row label="Notes from applicant">{app.notes}</Row>
            </div>
          )}
        </dl>
      </section>

      {/* Review history (if reviewed) */}
      {app.reviewedAt && (
        <section className="rounded-2xl border border-cobalt/15 bg-cobalt/[0.03] p-6 mb-6">
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — Review history
          </p>
          <p className="text-sm text-ink mb-1">
            <strong>{app.status}</strong> by {app.reviewerEmail ?? 'admin'} on{' '}
            {app.reviewedAt.toISOString().replace('T', ' ').slice(0, 16)}
          </p>
          {app.reviewerNote && (
            <p className="text-sm text-ink-soft italic mt-2">&ldquo;{app.reviewerNote}&rdquo;</p>
          )}
        </section>
      )}

      {/* Review actions — buttons available depend on current status */}
      <ReviewActions
        id={app.id}
        status={app.status}
        providerFirst={app.providerName.split(' ')[0]}
        practiceName={app.practiceName}
      />
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] tracking-[0.18em] uppercase font-bold text-ink-soft mb-1">
        {label}
      </dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles =
    status === 'APPROVED'
      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
      : status === 'REJECTED'
        ? 'bg-rose-50 border-rose-300 text-rose-800'
        : status === 'DEACTIVATED'
          ? 'bg-ink/5 border-ink/20 text-ink-soft'
          : 'bg-amber-50 border-amber-300 text-amber-800';
  return (
    <span
      className={`inline-block text-[11px] tracking-[0.18em] uppercase font-bold px-3 py-1 rounded border ${styles}`}
    >
      {status}
    </span>
  );
}
