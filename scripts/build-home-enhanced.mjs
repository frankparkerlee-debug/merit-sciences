/**
 * Merit homepage — enhanced.com register, v3.3: accordion + rulemaking watch + lot lookup.
 *
 * v2 verdict (Parker): "site is much better" but (1) COA lives ON every label
 * and box as a QR, (2) hero vial replaced — generate better on his OpenAI key,
 * (3) The Six get HUMAN imagery (performance / safe-for-humans), (4) generate
 * imagery wherever needed.
 *
 * v3 changes:
 *   · Hero: AI-generated cinematic athlete (hero-human-a — back view, cobalt
 *     rim light, negative space left for type). b/c variants in /brand.
 *   · The Six: v3 used six human-performance photos; Parker: hero human is
 *     enough — "1-6 overuses humans." Now a cinematic STILL-LIFE series, one
 *     metaphor object per use case (kintsugi bowl / melting ice / spent
 *     match / empty starting blocks / tipped hourglass / standing king).
 *     Human set kept on disk as lane-h-*.webp for PDP use.
 *   · Proof: "The receipt is printed on the label." — every label and box
 *     carries a QR; section shows a REAL scannable QR (public/brand/coa-qr.svg
 *     → meritsciences.com/coa/LOT2026-06-0001). Never a fake AI QR.
 *
 * Compliance lines unchanged from v2: "recommended" never "approved";
 * outcomes attributed to the literature; RUO footer + honest footnote;
 * no dosing/prep content.
 *
 * Run: node scripts/build-home-enhanced.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// The six PCAC-recommended peptides, framed by studied use case. Copy rule:
// use-case word is the CATEGORY; sentences attribute to research, never to
// Merit's product. Rendered as a native <details> accordion: closed = one
// compact row, open = literature blurb + fact chips + PDP link. Content
// lives in the DOM (crawlable) and needs zero JS.
const SIX = [
  ['01', 'REPAIR.', 'BPC-157',
    ['15 amino acids', 'Gastric-juice derived', 'Studied since 1991'],
    `A pentadecapeptide sequence originally isolated from human gastric juice, and the most
     heavily published compound of the six. Three decades of preclinical literature examine it
     in tendon, ligament, muscle and gastrointestinal injury models — much of the foundational
     work coming out of Sikiric's group in Zagreb.`],
  ['02', 'RECOVERY.', 'TB-500',
    ['7 amino acids', 'Thymosin \u03B24 fragment', 'Actin-binding domain'],
    `The synthetic fragment corresponding to the active actin-binding region of thymosin beta-4,
     a protein present in nearly every human cell and in wound fluid. The research literature
     centers on cell migration, tissue regeneration and flexibility following injury.`],
  ['03', 'INFLAMMATION.', 'KPV',
    ['3 amino acids', '\u03B1-MSH C-terminal', 'Lys-Pro-Val'],
    `The C-terminal tripeptide of alpha-melanocyte-stimulating hormone — lysine, proline, valine.
     Studied primarily in models of intestinal and cutaneous inflammation, where the interest is
     that it appears to carry the anti-inflammatory activity of the parent hormone without its
     pigmentary effects.`],
  ['04', 'METABOLIC.', 'MOTS-c',
    ['16 amino acids', 'Mitochondrial-encoded', 'Identified 2015'],
    `One of a small class of peptides encoded by mitochondrial rather than nuclear DNA, identified
     at USC in 2015. Research examines its role in metabolic regulation and exercise capacity. It
     is the youngest literature on this list — which cuts both ways.`],
  ['05', 'LONGEVITY.', 'EPITALON',
    ['4 amino acids', 'Pineal-derived', 'Khavinson, 1980s'],
    `A tetrapeptide developed from pineal gland extract by Vladimir Khavinson's group in
     St. Petersburg. Published work spans telomerase activity and circadian regulation, including
     long-running Russian cohort studies that Western literature has not replicated at scale.`],
  ['06', 'COGNITIVE.', 'SEMAX',
    ['7 amino acids', 'ACTH(4-10) analog', 'Russian registry drug'],
    `A heptapeptide analog of ACTH fragment 4-10, developed in Russia where it has been on the
     national registry of medicines for decades. Research addresses cognition, attention and
     neuroprotection — a substantial body of work, most of it published in Russian.`],
];

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!-- Concept preview. It lives in public/ so it can be reviewed on a phone at
     the deployed URL, which also makes it crawlable — hence noindex. Remove
     this line only when the design ships as the real / route. -->
<meta name="robots" content="noindex,nofollow">
<title>Merit — Enhanced-register v3.3</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#000;color:#fff;font-family:Archivo,Helvetica,sans-serif;-webkit-font-smoothing:antialiased}
  .mono{font-family:'Space Mono',monospace}
  .wrap{max-width:1360px;margin:0 auto;padding:0 40px}
  a{text-decoration:none;color:inherit}

  /* ── ticker + nav ───────────────────────────────────────────── */
  .promo{background:#2E4DDB;color:#fff;text-align:center;padding:10px;font-family:'Space Mono',monospace;
         font-size:11px;letter-spacing:.1em;text-transform:uppercase}
  .promo b{color:#B9FF66}
  .promo a{border-bottom:1px solid rgba(255,255,255,.7);margin-left:12px;font-weight:700}
  nav{position:sticky;top:0;z-index:60;display:flex;align-items:center;justify-content:space-between;
      padding:16px 40px;background:rgba(0,0,0,.72);backdrop-filter:blur(14px);
      border-bottom:1px solid rgba(255,255,255,.1)}
  nav .mark{font-size:20px;font-weight:900;letter-spacing:-.04em;text-transform:uppercase}
  nav .links{display:flex;gap:34px;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
  nav .links a{color:rgba(255,255,255,.72)}nav .links a:hover{color:#fff}
  nav .lot{font-family:'Space Mono',monospace;font-size:10.5px;letter-spacing:.08em;color:rgba(255,255,255,.5);white-space:nowrap}
  nav .lot b{color:#4ADE80;font-weight:700}

  /* ── hero ───────────────────────────────────────────────────── */
  .hero{position:relative;min-height:94vh;display:flex;align-items:flex-end;overflow:hidden}
  .hero .shot{position:absolute;inset:0}
  .hero .shot img{width:100%;height:100%;object-fit:cover;object-position:64% 22%;
                  filter:contrast(1.06) brightness(.92)}
  .hero .vig{position:absolute;inset:0;
    background:linear-gradient(90deg,rgba(0,0,0,.82) 0%,rgba(0,0,0,.25) 45%,rgba(0,0,0,0) 70%),
               linear-gradient(180deg,rgba(0,0,0,.6) 0%,rgba(0,0,0,0) 26%,rgba(0,0,0,.93) 100%)}
  .hero .inner{position:relative;z-index:2;width:100%;padding:0 40px 72px}
  .hero .kick{font-family:'Space Mono',monospace;font-size:12px;letter-spacing:.14em;color:#B9FF66;
              text-transform:uppercase;margin:0 0 22px}
  .hero h1{margin:0;font-size:clamp(64px,11.4vw,196px);font-weight:900;line-height:.82;
           letter-spacing:-.055em;text-transform:uppercase}
  .hero h1 em{font-style:normal;-webkit-text-stroke:2.5px rgba(255,255,255,.66);color:transparent}
  .hero .sub{display:flex;justify-content:space-between;align-items:flex-end;gap:40px;margin-top:42px;flex-wrap:wrap}
  .hero .sub p{margin:0;max-width:46ch;font-size:15px;line-height:1.62;color:rgba(255,255,255,.68)}
  .hero .sub p b{color:#fff;font-weight:700}
  .btn{display:inline-block;background:#fff;color:#000;padding:17px 44px;font-size:12px;font-weight:900;
       letter-spacing:.16em;text-transform:uppercase}
  .btn:hover{background:#2E4DDB;color:#fff}
  .btn.ghost{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.42)}
  .btn.ghost:hover{background:#fff;color:#000}

  /* ── statement band — the locked hook ───────────────────────── */
  .band{border-top:1px solid rgba(255,255,255,.14);border-bottom:1px solid rgba(255,255,255,.14);padding:72px 0}
  .band h2{margin:0;font-size:clamp(34px,5.4vw,84px);font-weight:900;line-height:.96;
           letter-spacing:-.04em;text-transform:uppercase}
  .band h2 u{text-decoration:none;color:#6B8AFF}
  .band p{margin:26px 0 0;max-width:60ch;font-size:15px;line-height:1.6;color:rgba(255,255,255,.55)}

  /* ── the six — compact type index, no images ────────────────── */
  .six{padding:72px 0 64px}
  .six .kick{font-family:'Space Mono',monospace;font-size:12px;letter-spacing:.14em;
             color:#B9FF66;text-transform:uppercase;margin:0 0 18px}
  .six h2{margin:0 0 40px;font-size:clamp(30px,4.4vw,64px);font-weight:900;line-height:.96;
          letter-spacing:-.04em;text-transform:uppercase;max-width:20ch}
  .index{border-top:1px solid rgba(255,255,255,.16)}
  .index details{border-bottom:1px solid rgba(255,255,255,.16)}
  .index summary{display:grid;grid-template-columns:64px 1fr auto auto 44px;gap:24px;align-items:center;
                 padding:20px 0;cursor:pointer;transition:background .15s;list-style:none}
  .index summary::-webkit-details-marker{display:none}
  .index summary:hover{background:rgba(46,77,219,.14)}
  .index .n{font-family:'Space Mono',monospace;font-size:12px;color:rgba(255,255,255,.35);padding-left:4px}
  .index .cat{font-size:clamp(22px,2.6vw,38px);font-weight:900;letter-spacing:-.035em;
              text-transform:uppercase;line-height:1}
  .index .cmp{font-family:'Space Mono',monospace;font-size:13px;font-weight:700;letter-spacing:.08em;color:#6B8AFF}
  .index .stamp{font-family:'Space Mono',monospace;font-size:10px;letter-spacing:.1em;color:#B9FF66;
                border:1px solid rgba(185,255,102,.4);padding:3px 9px;text-transform:uppercase;white-space:nowrap}
  .index .arrow{font-size:22px;font-weight:400;text-align:right;padding-right:8px;
                color:rgba(255,255,255,.45);transition:transform .2s}
  .index details[open] .arrow{transform:rotate(45deg);color:#B9FF66}
  .index summary:hover .arrow{color:#fff}
  .index .panel{display:grid;grid-template-columns:64px 1fr;gap:24px;padding:0 0 26px}
  .index .panel>div{grid-column:2;max-width:70ch}
  .index .panel p{margin:0 0 16px;font-size:14.5px;line-height:1.66;color:rgba(255,255,255,.6)}
  .index .facts{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 18px}
  .index .facts span{font-family:'Space Mono',monospace;font-size:10.5px;letter-spacing:.08em;
                     text-transform:uppercase;color:rgba(255,255,255,.5);
                     border:1px solid rgba(255,255,255,.18);padding:5px 10px}
  .index .view{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.16em;
               text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.4);padding-bottom:4px}
  .index .view:hover{color:#6B8AFF;border-color:#6B8AFF}
  .six-note{margin:22px 0 0;font-family:'Space Mono',monospace;font-size:11px;line-height:1.7;
            color:rgba(255,255,255,.38);max-width:86ch}

  /* ── rulemaking watch — compact status strip ────────────────── */
  .watch{border-top:1px solid rgba(255,255,255,.14);padding:56px 0}
  .watch .lead{font-family:'Space Mono',monospace;font-size:11px;letter-spacing:.14em;
               text-transform:uppercase;color:rgba(255,255,255,.42);margin:0 0 30px}
  .watch .lead b{color:#B9FF66}
  .steps{display:grid;grid-template-columns:repeat(4,1fr);gap:0;position:relative}
  .steps::before{content:'';position:absolute;top:5px;left:0;right:0;height:1px;background:rgba(255,255,255,.18)}
  .step{position:relative;padding:24px 18px 0 0}
  .step::before{content:'';position:absolute;top:0;left:0;width:11px;height:11px;border-radius:50%;
                background:#000;border:1px solid rgba(255,255,255,.35)}
  .step.done::before{background:#B9FF66;border-color:#B9FF66}
  .step.now::before{background:#2E4DDB;border-color:#6B8AFF;box-shadow:0 0 0 4px rgba(46,77,219,.3)}
  .step .t{font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;margin:0 0 6px}
  .step .d{font-family:'Space Mono',monospace;font-size:10.5px;letter-spacing:.08em;
           text-transform:uppercase;color:rgba(255,255,255,.45)}
  .step.done .d{color:#B9FF66}
  .step.now .d{color:#6B8AFF}

  /* ── proof — the QR is on the label ─────────────────────────── */
  .proof{border-top:1px solid rgba(255,255,255,.14);padding:80px 0}
  .proof .top{display:grid;grid-template-columns:1fr 300px;gap:64px;align-items:center;margin-bottom:56px}
  .proof .lead{font-family:'Space Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;
               color:rgba(255,255,255,.42);margin:0 0 24px}
  .proof h2{margin:0;max-width:16ch;font-size:clamp(32px,5vw,72px);font-weight:900;
            line-height:.96;letter-spacing:-.04em;text-transform:uppercase}
  .proof .top p{margin:22px 0 0;max-width:52ch;font-size:15px;line-height:1.62;color:rgba(255,255,255,.55)}
  .qr-card{background:#fff;color:#000;padding:22px;text-align:center}
  .qr-card img{width:100%;display:block}
  .qr-card .cap{font-family:'Space Mono',monospace;font-size:10px;letter-spacing:.1em;
                text-transform:uppercase;margin-top:14px;color:#000}
  .qr-card .cap b{color:#2E4DDB}
  .lookup{margin:22px 0 0;display:flex;gap:0;max-width:460px}
  .lookup input{flex:1;background:transparent;border:1px solid rgba(255,255,255,.3);border-right:0;
                color:#fff;font-family:'Space Mono',monospace;font-size:12px;letter-spacing:.06em;
                padding:14px 16px;outline:none}
  .lookup input::placeholder{color:rgba(255,255,255,.35)}
  .lookup input:focus{border-color:#6B8AFF}
  .lookup button{background:#fff;color:#000;border:0;font-family:Archivo,sans-serif;font-size:11px;
                 font-weight:900;letter-spacing:.16em;text-transform:uppercase;padding:14px 24px;cursor:pointer}
  .lookup button:hover{background:#2E4DDB;color:#fff}
  .proof .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:rgba(255,255,255,.14);
               border:1px solid rgba(255,255,255,.14)}
  .proof .grid div{background:#000;padding:30px 26px}
  .proof dt{font-family:'Space Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;
            color:rgba(255,255,255,.42)}
  .proof dd{margin:14px 0 0;font-size:clamp(28px,3.2vw,46px);font-weight:900;letter-spacing:-.03em}

  /* ── closing scene ──────────────────────────────────────────── */
  .close{position:relative;min-height:72vh;display:flex;align-items:flex-end;overflow:hidden;
         border-top:1px solid rgba(255,255,255,.14)}
  .close img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
             filter:contrast(1.08)}
  .close .vig{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.55),rgba(0,0,0,0) 40%,rgba(0,0,0,.9))}
  .close .inner{position:relative;z-index:2;width:100%;padding:0 40px 80px}
  .close h2{margin:0 0 34px;font-size:clamp(44px,7vw,120px);font-weight:900;line-height:.86;
            letter-spacing:-.05em;text-transform:uppercase}
  .close h2 em{font-style:normal;-webkit-text-stroke:2px rgba(255,255,255,.6);color:transparent}

  footer{border-top:1px solid rgba(255,255,255,.14);padding:44px 0;font-family:'Space Mono',monospace;
         font-size:11px;color:rgba(255,255,255,.4);letter-spacing:.04em;line-height:1.8}
  @media(max-width:1000px){
    .index summary{grid-template-columns:34px 1fr 30px;
                   grid-template-areas:"n cat arrow" ". cmp arrow";
                   row-gap:5px;column-gap:12px;padding:16px 0}
    .index .n{grid-area:n;padding-left:0}
    .index .cat{grid-area:cat}
    .index .cmp{grid-area:cmp}
    .index .stamp{display:none}
    .index .arrow{grid-area:arrow;align-self:center;padding-right:0}
    .index .panel{grid-template-columns:1fr;gap:0;padding:0 0 22px}
    .index .panel>div{grid-column:1;padding-left:46px}
    .proof .top{grid-template-columns:1fr}
    .qr-card{max-width:260px}
    .proof .grid{grid-template-columns:1fr 1fr}
    .steps{grid-template-columns:1fr 1fr;row-gap:26px}
    .steps::before{display:none}
    .step{padding-right:12px}
  }
  @media(max-width:700px){
    /* concept-only mobile nav: real port reuses the site's responsive Nav */
    nav{padding:14px 20px}
    nav .links,nav .lot{display:none}
    .promo{font-size:9px;letter-spacing:.06em;padding:8px 12px}
    .promo a{margin-left:8px}
    .wrap{padding:0 20px}
    .hero .inner,.close .inner{padding-left:20px;padding-right:20px}
    .hero .sub{margin-top:28px}
    .index .cat{font-size:24px}
    .index .panel>div{padding-left:0}
    .index .facts span{font-size:9.5px;padding:4px 8px}
    .lookup{flex-wrap:wrap}
    .lookup input{flex:1 1 100%;border-right:1px solid rgba(255,255,255,.3);font-size:11px}
    .lookup button{flex:1 1 100%;margin-top:8px}
  }
</style></head><body>

<div class="promo mono">FDA ADVISORY COMMITTEE · JUL 24 2026 · <b>6 PEPTIDES RECOMMENDED</b> FOR THE COMPOUNDING LIST<a href="#">READ THE BRIEF</a></div>

<nav>
  <div class="mark">Merit</div>
  <div class="links"><a href="#">Catalog</a><a href="#">The Six</a><a href="#">Lot reports</a><a href="#">Library</a><a href="#">Practitioners</a></div>
  <div class="lot mono">LOT 2026-06-0001 <b>PASS</b></div>
</nav>

<header class="hero">
  <div class="shot"><img src="/brand/hero-human-a.webp" alt=""></div>
  <div class="vig"></div>
  <div class="inner">
    <p class="kick mono">FDA PCAC · VOTED JUL 24 2026</p>
    <h1>The<br>research<br><em>caught up.</em></h1>
    <div class="sub">
      <p>Six peptides — <b>BPC-157, TB-500, KPV, MOTS-c, epitalon, semax</b> — just earned a
         federal advisory committee's recommendation for pharmacy compounding. We've been
         compounding and assaying every one of them for years. Receipts public.</p>
      <div>
        <a class="btn" href="#">Shop the six</a>
        <a class="btn ghost" href="#" style="margin-left:10px">Read a lot report</a>
      </div>
    </div>
  </div>
</header>

<section class="band"><div class="wrap">
  <h2>Pharmacy-grade.<br>Not <u>"trust me bro"</u>-grade.</h2>
  <p>The gray market got there first and poisoned the well. Merit exists for the other path:
     licensed compounding, independent assays, published lot reports — on the exact six
     compounds the committee just named.</p>
</div></section>

<section class="six"><div class="wrap">
  <p class="kick mono">THE SIX · RECOMMENDED JUL 24 2026</p>
  <h2>Named by the committee. Stocked by Merit.</h2>
  <div class="index">
    ${SIX.map(([n, cat, cmp, facts, body], i) => `
    <details${i === 0 ? ' open' : ''}>
      <summary>
        <span class="n mono">${n}</span>
        <span class="cat">${cat}</span>
        <span class="cmp mono">${cmp}</span>
        <span class="stamp mono">PCAC ✓</span>
        <span class="arrow">+</span>
      </summary>
      <div class="panel"><div>
        <p>${body}</p>
        <div class="facts">${facts.map((f) => `<span>${f}</span>`).join('')}</div>
        <a class="view" href="#">View ${cmp} + lot report →</a>
      </div></div>
    </details>`).join('')}
  </div>
  <p class="six-note mono">A PCAC recommendation is not FDA approval; rulemaking runs into 2027.
     All Merit compounds are research-use-only. Category terms describe each peptide's published
     literature — not our products.</p>
</div></section>

<section class="watch"><div class="wrap">
  <p class="lead mono">RULEMAKING WATCH · <b>LIVE</b> · WHAT HAS TO HAPPEN BEFORE THESE ARE 503A-LEGAL</p>
  <div class="steps">
    <div class="step done"><p class="t">Nominated</p><p class="d mono">Complete · 2025</p></div>
    <div class="step done"><p class="t">PCAC vote</p><p class="d mono">6 recommended · Jul 24 2026</p></div>
    <div class="step now"><p class="t">Proposed rule</p><p class="d mono">Pending · FDA</p></div>
    <div class="step"><p class="t">Final rule</p><p class="d mono">Expected 2027</p></div>
  </div>
</div></section>

<section class="proof"><div class="wrap">
  <div class="top">
    <div>
      <p class="lead mono">Lot 2026-06-0001 · released 14 June 2026</p>
      <h2>The receipt is printed on the label.</h2>
      <p>Every vial label and every box carries a QR code. Scan it and that lot's certificate
         of analysis opens — identity, purity, endotoxin, water — signed by the laboratory
         that ran it. No account. No request form. The one on the right is live.</p>
      <form class="lookup" action="/coa" method="get">
        <input name="lot" placeholder="OR TYPE A LOT NUMBER — LOT2026-06-0001" aria-label="Lot number">
        <button type="submit">Look up</button>
      </form>
    </div>
    <div class="qr-card">
      <img src="/brand/coa-qr.svg" alt="QR code linking to the certificate of analysis for lot 2026-06-0001">
      <div class="cap mono">SCAN → <b>MERITSCIENCES.COM/COA</b><br>LOT 2026-06-0001</div>
    </div>
  </div>
  <dl class="grid">
    <div><dt class="mono">Purity (HPLC)</dt><dd>99.31%</dd></div>
    <div><dt class="mono">Endotoxin</dt><dd>&lt;0.05</dd></div>
    <div><dt class="mono">Water (KF)</dt><dd>2.1%</dd></div>
    <div><dt class="mono">Assay → release</dt><dd>48 HRS</dd></div>
  </dl>
</div></section>

<section class="close">
  <img src="/brand/close-track.webp" alt="">
  <div class="vig"></div>
  <div class="inner">
    <h2>Stock what<br>the committee<br><em>recommended.</em></h2>
    <a class="btn" href="#">Shop the catalog</a>
  </div>
</section>

<footer><div class="wrap mono">FOR RESEARCH USE ONLY · NOT FOR HUMAN OR VETERINARY USE · NOT FDA-APPROVED<br>
MERIT SCIENCES · COMPOUNDED IN DALLAS, TX · EVERY LOT ASSAYED BY AN INDEPENDENT LABORATORY</div></footer>

</body></html>`;

writeFileSync(join(ROOT, 'public', 'home-enhanced.html'), html, 'utf8');
console.log('wrote public/home-enhanced.html (v3.3)');
