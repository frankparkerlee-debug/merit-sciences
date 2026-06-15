'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateProduct, deleteProduct, type ActionResult } from '../actions';

type ProductFormData = {
  handle: string;
  title: string;
  compound: string;
  eyebrow: string;
  vialSize: string;
  format: 'lyophilized' | 'reconstituted';
  oneLiner: string;
  priceCents: number;
  compareAtCents: number | null;
  bundlesJson: string;
  specCas: string | null;
  specMw: string | null;
  specFormula: string | null;
  specSequence: string | null;
  specAminoAcids: number | null;
  lotId: string;
  lotPurity: string;
  lotTestedDate: string;
  lotBud: string;
  lotCoaUrl: string | null;
  segment: 'biohacker' | 'clinic' | 'aesthetic' | 'athletic' | 'researcher';
  channel: 'rua' | 'clinic' | 'both';
  shopifySuspended: boolean;
  status: 'active' | 'draft';
  imageUrl: string | null;
  images: string[];
};

export function ProductForm({ product }: { product: ProductFormData }) {
  const [result, formAction] = useFormState<ActionResult | null, FormData>(updateProduct, null);

  return (
    <form action={formAction} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <input type="hidden" name="handle" value={product.handle} />

      {/* LEFT — content */}
      <div className="space-y-5">
        {/* Identity */}
        <Card label="Identity">
          <Field label="Title" required>
            <input
              type="text"
              name="title"
              required
              defaultValue={product.title}
              className={inputCls}
            />
          </Field>
          <Field label="Eyebrow" hint="Shown above title on PDP. UPPERCASE.">
            <input
              type="text"
              name="eyebrow"
              defaultValue={product.eyebrow}
              className={inputCls}
            />
          </Field>
          <Field label="One-liner" hint="Short description, shown in meta tags + catalog cards.">
            <textarea
              name="oneLiner"
              rows={2}
              defaultValue={product.oneLiner}
              className={textareaCls}
            />
          </Field>
          <Row>
            <Field label="Compound" required>
              <input
                type="text"
                name="compound"
                required
                defaultValue={product.compound}
                className={inputCls}
              />
            </Field>
            <Field label="Vial size" required>
              <input
                type="text"
                name="vialSize"
                required
                defaultValue={product.vialSize}
                className={inputCls}
              />
            </Field>
          </Row>
          <Field label="Format" required>
            <select name="format" defaultValue={product.format} className={inputCls}>
              <option value="lyophilized">Lyophilized</option>
              <option value="reconstituted">Reconstituted</option>
            </select>
          </Field>
        </Card>

        {/* Pricing */}
        <Card label="Pricing">
          <Row>
            <Field label="Price (USD)" required>
              <input
                type="text"
                inputMode="decimal"
                name="price"
                required
                defaultValue={(product.priceCents / 100).toFixed(2)}
                className={inputCls}
              />
            </Field>
            <Field label="Compare-at price (optional)">
              <input
                type="text"
                inputMode="decimal"
                name="compareAtPrice"
                defaultValue={product.compareAtCents ? (product.compareAtCents / 100).toFixed(2) : ''}
                className={inputCls}
              />
            </Field>
          </Row>
          <Field
            label="Bundles (JSON)"
            hint='Array of { "label": "3-Pack", "vials": 3, "priceCents": 21375 }. Leave blank for none.'
          >
            <textarea
              name="bundlesJson"
              rows={6}
              defaultValue={product.bundlesJson}
              className={`${textareaCls} font-mono text-xs`}
              placeholder='[{ "label": "Single", "vials": 1, "priceCents": 7500 }]'
            />
          </Field>
        </Card>

        {/* Spec */}
        <Card label="Chemistry spec">
          <Row>
            <Field label="CAS #">
              <input type="text" name="specCas" defaultValue={product.specCas ?? ''} className={inputCls} />
            </Field>
            <Field label="Molecular weight">
              <input type="text" name="specMw" defaultValue={product.specMw ?? ''} className={inputCls} placeholder="e.g. 2180.4 Da" />
            </Field>
          </Row>
          <Field label="Molecular formula">
            <input type="text" name="specFormula" defaultValue={product.specFormula ?? ''} className={`${inputCls} font-mono`} />
          </Field>
          <Field label="Amino acid sequence">
            <textarea
              name="specSequence"
              rows={2}
              defaultValue={product.specSequence ?? ''}
              className={`${textareaCls} font-mono text-xs`}
            />
          </Field>
          <Field label="Amino acid count">
            <input
              type="number"
              name="specAminoAcids"
              defaultValue={product.specAminoAcids ?? ''}
              className={`${inputCls} max-w-[160px]`}
            />
          </Field>
        </Card>

        {/* Lot */}
        <Card label="Current lot">
          <Row>
            <Field label="Lot ID">
              <input
                type="text"
                name="lotId"
                defaultValue={product.lotId}
                className={`${inputCls} font-mono`}
              />
            </Field>
            <Field label="Purity">
              <input
                type="text"
                name="lotPurity"
                defaultValue={product.lotPurity}
                className={inputCls}
                placeholder="≥99%"
              />
            </Field>
          </Row>
          <Row>
            <Field label="Tested date" hint="ISO date string, e.g. 2026-05-01">
              <input
                type="text"
                name="lotTestedDate"
                defaultValue={product.lotTestedDate}
                className={inputCls}
                placeholder="YYYY-MM-DD"
              />
            </Field>
            <Field label="Beyond-use date (BUD)">
              <input
                type="text"
                name="lotBud"
                defaultValue={product.lotBud}
                className={inputCls}
                placeholder="YYYY-MM-DD"
              />
            </Field>
          </Row>
          <Field label="COA URL" hint="Link to Certificate of Analysis PDF.">
            <input
              type="url"
              name="lotCoaUrl"
              defaultValue={product.lotCoaUrl ?? ''}
              className={inputCls}
              placeholder="https://…"
            />
          </Field>
        </Card>

        {/* Media */}
        <Card label="Media">
          <Field label="Primary image URL">
            <input
              type="url"
              name="imageUrl"
              defaultValue={product.imageUrl ?? ''}
              className={inputCls}
              placeholder="https://cdn…/aod-9604_1200x.png"
            />
          </Field>
          <Field label="Gallery image URLs" hint="One URL per line OR comma-separated.">
            <textarea
              name="images"
              rows={4}
              defaultValue={product.images.join('\n')}
              className={`${textareaCls} font-mono text-xs`}
            />
          </Field>
        </Card>
      </div>

      {/* RIGHT — settings sidebar */}
      <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
        <Card label="Status">
          <select name="status" defaultValue={product.status} className={inputCls}>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
        </Card>

        <Card label="Organization">
          <Field label="Channel">
            <select name="channel" defaultValue={product.channel} className={inputCls}>
              <option value="rua">RUA (public storefront)</option>
              <option value="clinic">Clinic (gated)</option>
              <option value="both">Both</option>
            </select>
          </Field>
          <Field label="Segment">
            <select name="segment" defaultValue={product.segment} className={inputCls}>
              <option value="biohacker">Biohacker</option>
              <option value="clinic">Clinic</option>
              <option value="aesthetic">Aesthetic</option>
              <option value="athletic">Athletic</option>
              <option value="researcher">Researcher</option>
            </select>
          </Field>
          <label className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              name="shopifySuspended"
              defaultChecked={product.shopifySuspended}
              className="w-4 h-4 rounded border-cobalt/30 text-cobalt focus:ring-cobalt"
            />
            <span className="text-sm text-ink">Shopify SKU suspended</span>
          </label>
        </Card>

        {/* Submit */}
        <div className="space-y-2">
          <SaveButton />
          {result && (
            <div
              className={`rounded-lg px-3 py-2 text-xs ${
                result.ok
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}
            >
              {result.ok ? result.message : result.error}
            </div>
          )}
        </div>

        <DeleteSection handle={product.handle} />
      </aside>
    </form>
  );
}

/* ─── building blocks ─── */

const inputCls =
  'block w-full rounded-xl border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt';

const textareaCls = `${inputCls} resize-y`;

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-cobalt/15 bg-white p-5 space-y-3">
      <p className="text-[10px] tracking-[0.18em] uppercase text-cobalt font-bold">— {label}</p>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
        {label} {required && <span className="text-rose-700">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-ink-soft/70 mt-1">{hint}</p>}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-ink text-white px-5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase hover:bg-cobalt transition disabled:opacity-60"
    >
      {pending ? 'Saving…' : 'Save product'}
    </button>
  );
}

function DeleteSection({ handle }: { handle: string }) {
  const [result, formAction] = useFormState<ActionResult | null, FormData>(deleteProduct, null);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(`Delete product "${handle}"? This removes it from the catalog AND storefront. Cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="handle" value={handle} />
      <Card label="Danger zone">
        <DeleteButton />
        {result && !result.ok && (
          <p className="text-xs text-rose-700">{result.error}</p>
        )}
      </Card>
    </form>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-rose-50 text-rose-900 border border-rose-200 px-4 py-2.5 rounded-lg text-xs font-bold tracking-wide uppercase hover:bg-rose-100 transition disabled:opacity-60"
    >
      {pending ? 'Deleting…' : 'Delete product'}
    </button>
  );
}
