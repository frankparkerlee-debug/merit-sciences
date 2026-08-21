/**
 * The packing slip document — the sheet the warehouse prints and drops in
 * the box.
 *
 * Deliberately self-contained: plain markup with its own embedded CSS, no
 * Tailwind, no next/image, no imports. A print document should render
 * identically regardless of what happens to the app's styling pipeline, and
 * keeping it dependency-free also makes it renderable standalone for
 * preview. Black-on-white on purpose — this comes out of a warehouse laser
 * printer, so it is designed for toner, not for a screen.
 */

export type SlipLine = {
  title: string;
  bundleLabel: string;
  qty: number;
  unitCents: number;
  components: string[];
};

export type SlipData = {
  orderRef: string;
  orderDate: string; // preformatted
  shipTo: { name: string; line1: string; line2?: string | null; city: string; state: string; zip: string };
  lines: SlipLine[];
  subtotalCents: number;
  discountCents: number;
  discountCode?: string | null;
  shippingCents: number;
  totalCents: number;
};

const money = (c: number) => `$${(c / 100).toFixed(2)}`;

export function PackingSlipDoc({ d }: { d: SlipData }) {
  return (
    <div id="packing-slip">
      <style dangerouslySetInnerHTML={{ __html: `
        #packing-slip {
          --ink: #0B0F19; --soft: #5C6378; --line: #D8DCE4; --cobalt: #2E4DDB;
          max-width: 7.5in; margin: 0 auto; background: #fff; color: var(--ink);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          font-size: 12px; line-height: 1.45;
        }
        #packing-slip .slip-head { display: flex; justify-content: space-between; align-items: flex-end;
          border-bottom: 3px solid var(--ink); padding-bottom: 14px; }
        #packing-slip .wordmark { font-size: 30px; font-weight: 900; letter-spacing: -0.04em; line-height: 1; }
        #packing-slip .wordmark span { color: var(--cobalt); }
        #packing-slip .doc-meta { text-align: right; }
        #packing-slip .doc-title { font-size: 11px; font-weight: 800; letter-spacing: 0.24em; text-transform: uppercase; }
        #packing-slip .doc-ref { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; margin-top: 3px; }
        #packing-slip .doc-date { color: var(--soft); font-size: 11px; margin-top: 2px; }
        #packing-slip .eyebrow { font-size: 9.5px; font-weight: 800; letter-spacing: 0.22em;
          text-transform: uppercase; color: var(--soft); margin: 18px 0 6px; }
        #packing-slip .shipto { font-size: 13px; }
        #packing-slip table.items { width: 100%; border-collapse: collapse; margin-top: 4px; }
        #packing-slip table.items th { text-align: left; font-size: 9.5px; font-weight: 800;
          letter-spacing: 0.18em; text-transform: uppercase; color: var(--soft);
          border-bottom: 2px solid var(--ink); padding: 0 6px 6px 0; }
        #packing-slip table.items th.num, #packing-slip table.items td.num { text-align: right; white-space: nowrap; padding-right: 0; }
        #packing-slip table.items td { border-bottom: 1px solid var(--line); padding: 9px 6px 9px 0; vertical-align: top; }
        #packing-slip td.qty { font-size: 15px; font-weight: 800; width: 34px; }
        #packing-slip .item-title { font-weight: 700; font-size: 13px; }
        #packing-slip .item-sub { color: var(--soft); font-size: 11px; }
        #packing-slip .item-components { color: var(--soft); font-size: 10.5px; margin-top: 2px; }
        #packing-slip .totals { margin-top: 8px; margin-left: auto; width: 2.9in; font-size: 12px; }
        #packing-slip .totals .row { display: flex; justify-content: space-between; padding: 2.5px 0; }
        #packing-slip .totals .muted { color: var(--soft); }
        #packing-slip .totals .grand { border-top: 2px solid var(--ink); margin-top: 4px; padding-top: 6px;
          font-weight: 900; font-size: 14px; }
        #packing-slip .cert { display: flex; gap: 14px; align-items: center; border: 1.5px solid var(--ink);
          border-radius: 10px; padding: 12px 14px; margin-top: 22px; }
        #packing-slip .cert img { width: 0.95in; height: 0.95in; }
        #packing-slip .cert-h { font-weight: 900; font-size: 14px; letter-spacing: -0.01em; }
        #packing-slip .cert-p { color: var(--soft); font-size: 11px; margin-top: 2px; }
        #packing-slip .cert-u { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; margin-top: 3px; }
        #packing-slip .thanks { margin-top: 16px; font-size: 12px; }
        #packing-slip .ruo { margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--line);
          font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--soft); }
        #packing-slip .packline { display: flex; gap: 28px; margin-top: 18px; font-size: 10.5px; color: var(--soft); }
        #packing-slip .packline span { border-top: 1px solid var(--ink); padding-top: 4px; min-width: 1.7in; }
        @media print {
          /* Isolate the sheet: everything else in the admin shell disappears. */
          body { visibility: hidden !important; }
          #packing-slip, #packing-slip * { visibility: visible !important; }
          #packing-slip { position: absolute; left: 0; top: 0; width: 100%; max-width: none; }
          @page { size: letter; margin: 0.6in; }
        }
      ` }} />

      <div className="slip-head">
        <div className="wordmark">Merit<span>.</span></div>
        <div className="doc-meta">
          <div className="doc-title">Packing slip</div>
          <div className="doc-ref">{d.orderRef}</div>
          <div className="doc-date">{d.orderDate}</div>
        </div>
      </div>

      <div className="eyebrow">— Ship to</div>
      <div className="shipto">
        <strong>{d.shipTo.name}</strong><br />
        {d.shipTo.line1}{d.shipTo.line2 ? <><br />{d.shipTo.line2}</> : null}<br />
        {d.shipTo.city}, {d.shipTo.state} {d.shipTo.zip}
      </div>

      <div className="eyebrow">— In this box</div>
      <table className="items">
        <thead>
          <tr><th>Qty</th><th>Item</th><th className="num">Unit</th><th className="num">Total</th></tr>
        </thead>
        <tbody>
          {d.lines.map((l, i) => (
            <tr key={i}>
              <td className="qty">{l.qty}</td>
              <td>
                <div className="item-title">{l.title}</div>
                <div className="item-sub">{l.bundleLabel}</div>
                {l.components.length > 0 && (
                  <div className="item-components">Contains: {l.components.join(' · ')}</div>
                )}
              </td>
              <td className="num">{money(l.unitCents)}</td>
              <td className="num"><strong>{money(l.unitCents * l.qty)}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="totals">
        <div className="row"><span className="muted">Subtotal</span><span>{money(d.subtotalCents)}</span></div>
        {d.discountCents > 0 && (
          <div className="row"><span className="muted">Discount{d.discountCode ? ` (${d.discountCode})` : ''}</span><span>−{money(d.discountCents)}</span></div>
        )}
        <div className="row"><span className="muted">Shipping</span><span>{d.shippingCents === 0 ? 'Free' : money(d.shippingCents)}</span></div>
        <div className="row grand"><span>Total</span><span>{money(d.totalCents)}</span></div>
      </div>

      <div className="cert">
        <img src="/brand/coa-qr.svg" alt="QR code to the Merit lab results library" />
        <div>
          <div className="cert-h">Every vial ships with its certificate.</div>
          <div className="cert-p">
            Scan the QR on any vial label — it resolves to that lot&rsquo;s published identity and
            purity report, tested by an independent laboratory. Or browse the full library:
          </div>
          <div className="cert-u">meritsciences.com/coa</div>
        </div>
      </div>

      <p className="thanks">
        We spend on the lab, not the logo — orders like yours keep every lot independently
        assayed and published. Genuinely: thank you. Questions? Reply to your confirmation
        email or write <strong>info@meritpeptides.com</strong> — you reach the team that packed this box.
      </p>

      <div className="ruo">
        For research use only · Not for human or veterinary use · Not FDA-approved
      </div>

      <div className="packline">
        <span>Packed by</span>
        <span>Checked by</span>
        <span>Date</span>
      </div>
    </div>
  );
}
