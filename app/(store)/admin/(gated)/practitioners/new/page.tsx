import Link from 'next/link';
import { NewPractitionerForm } from './NewPractitionerForm';

export const metadata = { title: 'New practitioner — Merit Admin' };
export const dynamic = 'force-dynamic';

export default function NewPractitionerPage() {
  return (
    <main className="max-w-[720px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <Link
        href="/admin/practitioners"
        className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3 inline-block hover:underline underline-offset-4"
      >
        ← Practitioners
      </Link>
      <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl mb-1">
        New practitioner<span className="text-cobalt">.</span>
      </h1>
      <p className="text-sm text-ink-soft leading-relaxed max-w-xl mb-8">
        Creates an <strong className="text-ink">approved</strong> physician profile directly — no
        public application needed. Assign pricing and a referring affiliate on the profile page
        after creating. They sign in at <code className="text-xs bg-cobalt/5 px-1 rounded">/practitioners/login</code> with
        this email.
      </p>
      <NewPractitionerForm />
    </main>
  );
}
