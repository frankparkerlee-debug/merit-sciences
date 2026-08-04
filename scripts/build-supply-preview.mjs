/**
 * Build a standalone preview of the Merit Clinical catalog.
 *
 * Exists because the local DATABASE_URL credentials are stale, so the dev
 * server renders the storefront empty. This reproduces the shop grid from the
 * same product data and inlines the generated SVGs, so the catalog can be
 * reviewed without a database connection or a deploy.
 *
 * Run: node scripts/build-supply-preview.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

import { CATALOG, titleFor } from './supply-catalog.mjs';

const P = CATALOG.map((p) => [
  titleFor(p), 'Merit Clinical', p.cat, p.cents, p.ref, p.size, p.box, p.hcpcs, p.file, p.blurb, p.rx,
]);

const money = (c) => `$${(c / 100).toFixed(2)}`;
const per = (c, n) => (n > 1 ? `$${(c / n / 100).toFixed(2)}` : null);

const cards = P.map(([title, brand, cat, cents, sku, size, box, hcpcs, img, blurb, rx]) => {
  const svg = readFileSync(join(ROOT, 'public', 'supply', `${img}.svg`), 'utf8');
  const u = per(cents, box);
  return `<article class="card">
    <div class="thumb">${svg}</div>
    <div class="body">
      <p class="brand">${brand}${rx ? ' <span class="rx">Rx</span>' : ''}</p>
      <h3>${title}</h3>
      <p class="blurb">${blurb}</p>
      <dl class="specs">
        <div><dt>REF</dt><dd>${sku}</dd></div>
        <div><dt>HCPCS</dt><dd>${hcpcs}</dd></div>
      </dl>
    </div>
    <div class="foot">
      <div><p class="price">${money(cents)}</p><p class="unit">Box of ${box}${u ? ` · ${u}/ea` : ''}</p></div>
      <button>Add to cart</button>
    </div>
  </article>`;
}).join('\n');

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Merit Clinical — catalog preview</title>
<style>
  :root{--ink:#0B0F19;--soft:#4A5160;--muted:#94A0B0;--cobalt:#2E4DDB;--cream:#F4F1EA;--border:#E2E5EB}
  *{box-sizing:border-box}
  body{margin:0;font-family:Inter,-apple-system,system-ui,sans-serif;background:var(--cream);color:var(--ink)}
  header{background:#fff;border-bottom:1px solid var(--border)}
  .wrap{max-width:1180px;margin:0 auto;padding:0 20px}
  .nav{display:flex;align-items:center;justify-content:space-between;padding:16px 0}
  .mark{font-size:19px;font-weight:800;letter-spacing:-.4px}
  .mark span{color:var(--cobalt)}
  .mark small{margin-left:8px;font-size:10.5px;font-weight:700;letter-spacing:3px;color:var(--muted)}
  .hero{padding:56px 0 40px}
  .eyebrow{margin:0;font-size:11px;font-weight:800;letter-spacing:2px;color:var(--cobalt)}
  h1{margin:10px 0 0;font-size:44px;line-height:1.05;letter-spacing:-1.4px;font-weight:800}
  .lede{margin:16px 0 0;max-width:620px;font-size:16px;line-height:1.6;color:var(--soft)}
  .note{margin:28px 0 0;padding:12px 16px;border-left:3px solid var(--cobalt);background:#fff;font-size:13px;color:var(--soft);max-width:620px}
  h2{margin:40px 0 4px;font-size:22px;letter-spacing:-.5px}
  .sub{margin:0 0 18px;font-size:13px;color:var(--muted)}
  .grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));padding-bottom:8px}
  .card{display:flex;flex-direction:column;background:#fff;border:1px solid var(--border);border-radius:16px;overflow:hidden}
  .thumb{background:#fff;border-bottom:1px solid var(--border)}
  .thumb svg{display:block;width:100%;height:auto}
  .body{padding:14px 16px 0;flex:1}
  .brand{margin:0;font-size:10px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:var(--cobalt)}
  .rx{margin-left:6px;padding:1px 5px;border:1px solid #F0B040;border-radius:3px;color:#8a6300;background:#FFF8E8;letter-spacing:.5px}
  h3{margin:6px 0 0;font-size:15px;font-weight:800;line-height:1.3}
  .blurb{margin:8px 0 0;font-size:12.5px;line-height:1.55;color:var(--soft)}
  .specs{display:flex;gap:16px;margin:12px 0 14px}
  .specs div{display:flex;gap:5px;font-size:11px}
  .specs dt{margin:0;font-weight:700;color:var(--muted)}
  .specs dd{margin:0;font-family:ui-monospace,monospace;color:var(--soft)}
  .foot{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:12px 16px 14px;border-top:1px solid var(--border)}
  .price{margin:0;font-size:17px;font-weight:800;letter-spacing:-.4px}
  .unit{margin:2px 0 0;font-size:11px;color:var(--muted)}
  button{border:0;border-radius:8px;background:var(--ink);color:#fff;font:inherit;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:9px 14px;cursor:pointer}
  footer{margin-top:48px;background:#fff;border-top:1px solid var(--border);padding:26px 0}
  footer p{margin:0;font-size:12px;color:var(--muted);max-width:760px;line-height:1.6}
</style></head><body>
<header><div class="wrap"><div class="nav">
  <div class="mark">Merit<span>.</span><small>CLINICAL</small></div>
  <div style="font-size:13px;font-weight:600;color:var(--soft)">Shop all · Collagen · Wound care</div>
</div></div></header>

<div class="wrap">
  <section class="hero">
    <p class="eyebrow">— CLINICAL SUPPLY</p>
    <h1>Wound care supply,<br>without the markup.</h1>
    <p class="lede">Collagen, alginates, and foams — sold by the box, direct to your practice.
      Every product lists its REF number and HCPCS code so you can match what you already order.</p>
    <p class="note"><strong>Preview only.</strong> Package renders are illustrative, not photography —
      final artwork follows supplier selection. Pricing is a working target pending landed cost.
      Nothing here is publicly reachable: <code>SUPPLY_STOREFRONT</code> is off.</p>
  </section>

  <h2>All products</h2>
  <p class="sub">${P.length} SKUs · priced per box · free shipping over $300</p>
  <div class="grid">
${cards}
  </div>
</div>

<footer><div class="wrap"><p>Medical supplies sold to licensed clinicians and healthcare facilities.
HCPCS codes are provided for reference only and are not a guarantee of coverage or reimbursement —
verify against the payer's current policy. US shipping only · All prices in USD.</p></div></footer>
</body></html>`;

const out = join(ROOT, '..', 'merit-clinical-catalog-preview.html');
writeFileSync(out, html, 'utf8');
console.log(`wrote ${out}`);
