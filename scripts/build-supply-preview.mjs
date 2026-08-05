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
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

import { CATALOG, titleFor, boxCents } from './supply-catalog.mjs';
import { PHOTO_MAP } from './generate-supply-photos.mjs';

const FORM = new Map();
for (const [form, files] of Object.entries(PHOTO_MAP)) for (const f of files) FORM.set(f, form);

const P = CATALOG.map((p) => [
  titleFor(p), p.eyebrow, p.cat, boxCents(p), p.ref, p.size, p.box, p.hcpcs, FORM.get(p.file), p.blurb, p.rx,
]);

const money = (c) => `$${(c / 100).toFixed(2)}`;
const per = (c, n) => (n > 1 ? `$${(c / n / 100).toFixed(2)}` : null);

const cards = P.map(([title, brand, cat, cents, sku, size, box, hcpcs, img, blurb, rx]) => {
  const src = `merit-render/public/supply/photo/${img}.webp`;
  const u = per(cents, box);
  return `<article class="card">
    <a class="thumb" href="#"><img src="${src}" alt="${title}" loading="lazy"></a>
    <div class="body">
      <p class="brand">${brand ?? ''}${rx ? ' <span class="rx">Rx</span>' : ''}</p>
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
  :root{--ink:#0B0F19;--soft:#4A5160;--muted:#94A0B0;--paper:#F6F7F9;--line:#E4E7EC}
  *{box-sizing:border-box}
  body{margin:0;font-family:Inter,-apple-system,system-ui,sans-serif;background:var(--paper);color:var(--ink);-webkit-font-smoothing:antialiased}
  a{color:inherit;text-decoration:none}
  header{position:sticky;top:0;z-index:9;background:rgba(255,255,255,.95);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
  .wrap{max-width:1280px;margin:0 auto;padding:0 24px}
  .nav{display:flex;align-items:center;justify-content:space-between;padding:14px 0}
  .mark{display:flex;align-items:baseline;gap:10px;font-size:18px;font-weight:700;letter-spacing:-.03em}
  .mark small{border-left:1px solid var(--line);padding-left:10px;font-size:10px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--muted)}
  .navlinks{display:flex;gap:24px;font-size:13px;font-weight:500;color:var(--soft)}
  .hero{background:#fff;border-bottom:1px solid var(--line)}
  .hero .wrap{padding:96px 24px 88px}
  .eyebrow{margin:0;font-size:11px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--muted)}
  h1{margin:20px 0 0;max-width:15ch;font-size:56px;line-height:1.06;letter-spacing:-.035em;font-weight:700}
  .lede{margin:24px 0 0;max-width:52ch;font-size:16px;line-height:1.65;color:var(--soft)}
  .cta{display:inline-block;margin:36px 12px 0 0;border:1px solid var(--ink);background:var(--ink);color:#fff;padding:12px 28px;font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase}
  .cta.alt{background:#fff;color:var(--ink);border-color:var(--line)}
  .strip{background:#fff;border-bottom:1px solid var(--line)}
  .strip .grid4{display:grid;grid-template-columns:repeat(4,1fr);border-left:1px solid var(--line);border-right:1px solid var(--line)}
  .strip .cell{padding:24px;border-right:1px solid var(--line)}
  .strip .cell:last-child{border-right:0}
  .strip .cell p:first-child{margin:0;font-size:10px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
  .strip .cell p:last-child{margin:8px 0 0;font-size:15px;font-weight:500;letter-spacing:-.01em}
  h2{margin:0;font-size:20px;font-weight:600;letter-spacing:-.02em}
  .sechead{display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid var(--line);padding:0 0 16px;margin:64px 0 24px}
  .sub{font-size:12.5px;color:var(--muted);font-variant-numeric:tabular-nums}
  .grid{display:grid;gap:1px;background:var(--line);grid-template-columns:repeat(auto-fill,minmax(272px,1fr))}
  .card{display:flex;flex-direction:column;background:#fff}
  .thumb{display:block;border-bottom:1px solid var(--line)}
  .thumb img{display:block;width:100%;height:auto;aspect-ratio:1;object-fit:cover}
  .body{padding:16px;flex:1;display:flex;flex-direction:column}
  .brand{margin:0;font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
  .rx{margin-left:8px;border:1px solid rgba(11,15,25,.2);padding:1px 6px;font-size:9px;font-weight:700;letter-spacing:.1em;color:var(--soft)}
  h3{margin:8px 0 0;font-size:15px;font-weight:600;line-height:1.35;letter-spacing:-.01em}
  .blurb{margin:6px 0 0;font-size:12.5px;line-height:1.55;color:var(--soft);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .specs{display:flex;gap:16px;margin:12px 0 0}
  .specs div{display:flex;gap:6px;font-size:11px}
  .specs dt{margin:0;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
  .specs dd{margin:0;font-family:ui-monospace,SFMono-Regular,monospace;font-weight:500;color:var(--soft)}
  .foot{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-top:auto;padding-top:16px}
  .price{margin:0;font-size:17px;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
  .unit{margin:2px 0 0;font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums}
  button{border:1px solid var(--ink);background:var(--ink);color:#fff;font:inherit;font-size:10.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;padding:8px 14px;cursor:pointer}
  footer{margin-top:96px;background:#fff;border-top:1px solid var(--line);padding:48px 0}
  footer p{margin:0;font-size:11.5px;color:var(--muted);max-width:70ch;line-height:1.7}
  .note{margin:32px 0 0;border:1px solid var(--line);background:#fff;padding:14px 18px;font-size:12.5px;color:var(--soft);max-width:64ch;line-height:1.6}
</style></head><body>
<header><div class="wrap"><div class="nav">
  <div class="mark">Merit<small>Clinical</small></div>
  <div class="navlinks"><span>Catalog</span><span>Collagen</span><span>Wound care</span></div>
</div></div></header>

<section class="hero"><div class="wrap">
  <p class="eyebrow">Advanced wound care</p>
  <h1>Clinical supply, sourced direct.</h1>
  <p class="lede">Collagen, alginates, foams, gels, and securement &mdash; supplied by the box to
    clinicians and healthcare facilities. Every item lists its REF number and HCPCS code so it can
    be matched against what you already order.</p>
  <a class="cta" href="#">View catalog</a><a class="cta alt" href="#">Collagen</a>
  <p class="note"><strong>Preview.</strong> Product photography is generated for layout review and is
    replaced with shot-in-studio images once inventory lands. Pricing is a working target pending
    landed cost, and HCPCS codes require PDAC verification before sale.</p>
</div></section>

<section class="strip"><div class="wrap" style="padding:0"><div class="grid4">
  <div class="cell"><p>Catalog</p><p>${P.length} SKUs</p></div>
  <div class="cell"><p>Pricing</p><p>From $15.00 per box</p></div>
  <div class="cell"><p>Coding</p><p>HCPCS listed per item</p></div>
  <div class="cell"><p>Shipping</p><p>Free over $300 &middot; US only</p></div>
</div></div></section>

<div class="wrap">
  <div class="sechead"><h2>All products</h2><span class="sub">${P.length} SKUs &middot; priced per box</span></div>
<h2>All products</h2>
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
