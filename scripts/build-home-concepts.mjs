/**
 * Three homepage directions for Merit Sciences, as a single scrollable file.
 *
 * Built as static HTML rather than in Next because the point is to CHOOSE a
 * direction, not to ship one. Concepts are cheap here and expensive in the app,
 * and the app's homepage is 940 lines wired to live product data.
 *
 * These are deliberately DIFFERENT BETS, not three coats of paint on the same
 * layout. Repairing the current structure landed in the uncanny valley — same
 * page, better spacing — which is what prompted the overhaul.
 *
 * Assets are the real Merit brand files, so what's on screen is achievable.
 *
 * Run: node scripts/build-home-concepts.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const A = 'merit-render/public'; // relative from the Desktop/Merit Peptides folder

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Merit — three homepage directions</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Inter+Tight:wght@500;600;700;800;900&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;background:#0B0F19}

  /* ── chooser rail ─────────────────────────────────────────────── */
  .rail{position:fixed;top:0;left:0;right:0;z-index:99;display:flex;align-items:center;gap:8px;
        padding:10px 20px;background:rgba(11,15,25,.92);backdrop-filter:blur(10px);
        border-bottom:1px solid rgba(255,255,255,.12)}
  .rail b{color:#fff;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;margin-right:8px}
  .rail a{color:rgba(255,255,255,.62);font-size:12px;font-weight:600;text-decoration:none;
          padding:6px 12px;border:1px solid rgba(255,255,255,.18);border-radius:99px}
  .rail a:hover{color:#fff;border-color:rgba(255,255,255,.5)}
  .tag{position:sticky;top:44px;z-index:50;padding:10px 20px;font-size:11px;font-weight:700;
       letter-spacing:.18em;text-transform:uppercase}

  section.concept{min-height:100vh}
  .wrap{max-width:1280px;margin:0 auto;padding:0 32px}
  .mono{font-family:'JetBrains Mono',ui-monospace,monospace}

  /* ══ A · LABORATORY ═══════════════════════════════════════════════ */
  .A{background:#07090F;color:#fff}
  .A .tagbar{background:#111827;color:#8FA6FF}
  .A .hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;
           min-height:calc(100vh - 44px);padding:80px 0}
  .A .eyebrow{margin:0 0 28px;font-size:11px;font-weight:600;letter-spacing:.26em;text-transform:uppercase;color:#6B8AFF}
  .A h1{margin:0;font-family:'Inter Tight',sans-serif;font-size:clamp(48px,6.6vw,108px);
        font-weight:800;line-height:.94;letter-spacing:-.045em}
  .A h1 em{font-style:normal;color:#6B8AFF}
  .A .lede{margin:32px 0 0;max-width:46ch;font-size:17px;line-height:1.68;color:rgba(255,255,255,.62)}
  .A .btns{margin-top:40px;display:flex;gap:12px;flex-wrap:wrap}
  .A .b1{background:#2E4DDB;color:#fff;padding:15px 32px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none}
  .A .b2{border:1px solid rgba(255,255,255,.24);color:#fff;padding:15px 32px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none}
  .A .spec{margin-top:64px;display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,.12);
           border:1px solid rgba(255,255,255,.12)}
  .A .spec div{background:#07090F;padding:22px}
  .A .spec dt{font-size:10px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.42)}
  .A .spec dd{margin:10px 0 0;font-size:22px;font-weight:700;letter-spacing:-.02em}
  .A .vial{position:relative;aspect-ratio:1;max-width:600px;margin-left:auto}
  .A .vial .glow{position:absolute;inset:6%;border-radius:50%;filter:blur(70px);
                 background:radial-gradient(circle at 50% 45%,rgba(46,77,219,.65) 0%,rgba(46,77,219,.22) 48%,transparent 72%)}
  .A .vial img{position:relative;width:100%;height:100%;object-fit:contain;transform:rotate(-6deg)}
  .A .strip{border-top:1px solid rgba(255,255,255,.1);border-bottom:1px solid rgba(255,255,255,.1);padding:20px 0}
  .A .strip .wrap{display:flex;gap:40px;font-size:11px;font-weight:600;letter-spacing:.16em;
                  text-transform:uppercase;color:rgba(255,255,255,.5);flex-wrap:wrap}

  /* ══ B · EDITORIAL ════════════════════════════════════════════════ */
  .B{background:#FBFBF9;color:#14161A}
  .B .tagbar{background:#14161A;color:#fff}
  .B .hero{padding:120px 0 96px;border-bottom:1px solid #E2E1DC}
  .B .kicker{display:flex;align-items:center;gap:14px;margin:0 0 40px;font-size:11px;
             font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:#8A8781}
  .B .kicker span{height:1px;flex:1;background:#DEDCD6}
  .B h1{margin:0;max-width:16ch;font-family:'Instrument Serif',Georgia,serif;
        font-size:clamp(56px,8.4vw,144px);font-weight:400;line-height:.96;letter-spacing:-.03em}
  .B h1 i{font-style:italic;color:#2E4DDB}
  .B .row{display:grid;grid-template-columns:1.2fr .8fr;gap:64px;align-items:end;margin-top:56px}
  .B .lede{margin:0;font-size:19px;line-height:1.6;color:#4A4843;max-width:40ch}
  .B .meta{display:grid;gap:18px}
  .B .meta div{display:flex;justify-content:space-between;border-bottom:1px solid #E2E1DC;padding-bottom:12px}
  .B .meta dt{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#8A8781}
  .B .meta dd{margin:0;font-size:14px;font-weight:600}
  .B .plate{margin-top:80px;position:relative;aspect-ratio:21/9;overflow:hidden;background:#14161A}
  .B .plate img{width:100%;height:100%;object-fit:cover;opacity:.9}
  .B .plate figcaption{position:absolute;left:28px;bottom:24px;color:#fff;font-size:12px;letter-spacing:.06em}
  .B .cta{display:inline-block;margin-top:56px;border-bottom:2px solid #14161A;padding-bottom:4px;
          color:#14161A;text-decoration:none;font-size:16px;font-weight:600}

  /* ══ C · COMMERCE ═════════════════════════════════════════════════ */
  .C{background:#fff;color:#111}
  .C .tagbar{background:#2E4DDB;color:#fff}
  .C .hero{position:relative;padding:88px 0 72px;
           background:linear-gradient(168deg,#EEF1FE 0%,#F7F8FD 52%,#fff 100%)}
  .C .hgrid{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
  .C .pill{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid #DDE2F4;
           border-radius:99px;padding:7px 16px;font-size:12px;font-weight:600;color:#2E4DDB;margin-bottom:26px}
  .C h1{margin:0;font-family:'Inter Tight',sans-serif;font-size:clamp(42px,5.4vw,74px);
        font-weight:800;line-height:1.02;letter-spacing:-.035em}
  .C .lede{margin:22px 0 0;max-width:44ch;font-size:17px;line-height:1.62;color:#4B5060}
  .C .b1{display:inline-block;margin-top:32px;background:#111;color:#fff;padding:17px 40px;
         border-radius:99px;font-size:15px;font-weight:700;text-decoration:none}
  .C .trust{margin-top:26px;font-size:13px;color:#6B7080}
  .C .cards{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
  .C .card{background:#fff;border:1px solid #E8EAF0;border-radius:20px;padding:22px;
           box-shadow:0 1px 2px rgba(17,17,17,.04)}
  .C .card img{width:100%;aspect-ratio:1;object-fit:contain;margin-bottom:14px}
  .C .card p{margin:0;font-size:14px;font-weight:700}
  .C .card small{display:block;margin-top:4px;color:#6B7080;font-size:13px;font-weight:500}
  .C .band{background:#111;color:#fff;padding:72px 0}
  .C .band h2{margin:0 0 40px;font-family:'Inter Tight',sans-serif;font-size:clamp(28px,3.4vw,44px);
              font-weight:800;letter-spacing:-.03em}
  .C .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:32px}
  .C .steps h3{margin:0 0 8px;font-size:17px;font-weight:700}
  .C .steps p{margin:0;font-size:14px;line-height:1.6;color:rgba(255,255,255,.6)}
  .C .steps b{display:block;margin-bottom:16px;font-family:'JetBrains Mono',monospace;
              font-size:12px;color:#6B8AFF}

  @media(max-width:900px){
    .A .hero,.C .hgrid,.B .row{grid-template-columns:1fr}
    .A .vial{display:none}.C .cards{grid-template-columns:1fr 1fr}
    .A .spec,.C .steps{grid-template-columns:1fr}
  }
</style></head><body>

<nav class="rail">
  <b>Merit · homepage directions</b>
  <a href="#a">A · Laboratory</a>
  <a href="#b">B · Editorial</a>
  <a href="#c">C · Commerce</a>
</nav>

<!-- ══════════ A ══════════ -->
<section class="concept A" id="a">
  <div class="tag tagbar">A · Laboratory — clinical dark, specimen-lit, data forward</div>
  <div class="wrap hero">
    <div>
      <p class="eyebrow">Merit Sciences · Dallas, Texas</p>
      <h1>Every lot,<br>on the <em>record</em>.</h1>
      <p class="lede">Pharmacy-grade compounds made by a US-licensed team and third-party verified
        before a single vial ships. Identity, purity, endotoxin — published per lot, not on request.</p>
      <div class="btns">
        <a class="b1" href="#">Shop the catalog</a>
        <a class="b2" href="#">Read a lot report →</a>
      </div>
      <dl class="spec">
        <div><dt>Purity</dt><dd class="mono">≥ 99.1%</dd></div>
        <div><dt>Released in</dt><dd class="mono">48 hrs</dd></div>
        <div><dt>Lots published</dt><dd class="mono">100%</dd></div>
      </dl>
    </div>
    <div class="vial"><div class="glow"></div>
      <img src="${A}/brand/merit-vial-canonical-transparent.webp" alt="">
    </div>
  </div>
  <div class="strip"><div class="wrap">
    <span>US-licensed pharmacy team</span><span>Third-party verified</span>
    <span>Sealed sterile vials</span><span>ISO-certified cleanroom</span>
  </div></div>
</section>

<!-- ══════════ B ══════════ -->
<section class="concept B" id="b">
  <div class="tag tagbar">B · Editorial — serif authority, print-journal restraint</div>
  <div class="wrap hero">
    <p class="kicker">Merit Sciences <span></span> Est. Dallas</p>
    <h1>The difference is <i>documented</i>.</h1>
    <div class="row">
      <p class="lede">Most peptide sellers resell. We make ours with a licensed pharmacy team, test every
        lot through an independent laboratory, and publish the certificate before it ships.</p>
      <dl class="meta">
        <div><dt>Compounds</dt><dd>30 in catalog</dd></div>
        <div><dt>Verification</dt><dd>Independent, per lot</dd></div>
        <div><dt>Dispatch</dt><dd>Within 48 hours</dd></div>
      </dl>
    </div>
    <a class="cta" href="#">Read the current lot report →</a>
    <figure class="plate">
      <img src="${A}/brand/scene-lab.webp" alt="">
      <figcaption>Lot LOT2026-06-0001 · released 2026-06-14</figcaption>
    </figure>
  </div>
</section>

<!-- ══════════ C ══════════ -->
<section class="concept C" id="c">
  <div class="tag tagbar">C · Commerce — Hims/Hers register, product early, conversion first</div>
  <div class="hero"><div class="wrap hgrid">
    <div>
      <span class="pill">✓ Verified per lot · Ships in 48 hrs</span>
      <h1>Research-grade peptides, without the guesswork.</h1>
      <p class="lede">Made by a US-licensed pharmacy team in Dallas. Third-party tested. Certificate
        published for every lot before it leaves the building.</p>
      <a class="b1" href="#">Shop the catalog →</a>
      <p class="trust">Free shipping over $300 · 30 compounds in stock</p>
    </div>
    <div class="cards">
      <div class="card"><img src="${A}/brand/lane-bpc-transparent.webp" alt=""><p>BPC-157</p><small>10 mg · $60.99</small></div>
      <div class="card"><img src="${A}/brand/lane-nad-transparent.webp" alt=""><p>NAD+</p><small>500 mg · $84.99</small></div>
      <div class="card"><img src="${A}/brand/lane-blends-transparent.webp" alt=""><p>Klow blend</p><small>80 mg · $174.99</small></div>
      <div class="card"><img src="${A}/brand/lane-selank-transparent.webp" alt=""><p>Selank</p><small>10 mg · $55.99</small></div>
    </div>
  </div></div>
  <div class="band"><div class="wrap">
    <h2>How a Merit lot gets released.</h2>
    <div class="steps">
      <div><b>01</b><h3>Compounded</h3><p>A US-licensed pharmacy team compounds each lot in an ISO-certified cleanroom.</p></div>
      <div><b>02</b><h3>Tested</h3><p>An independent lab runs identity, purity, and endotoxin on every lot.</p></div>
      <div><b>03</b><h3>Published</h3><p>The certificate goes live before the lot ships. Scan the vial to read it.</p></div>
    </div>
  </div></div>
</section>

</body></html>`;

const out = join(ROOT, '..', 'merit-home-concepts.html');
writeFileSync(out, html, 'utf8');
console.log(`wrote ${out}`);
