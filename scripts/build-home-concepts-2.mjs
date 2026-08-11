/**
 * Round two. The first three were competent and forgettable — left type, right
 * product, glow behind it, which is every SaaS homepage since 2019.
 *
 * These push on the thing no competitor can copy: Merit publishes a certificate
 * for every lot. Resellers cannot, because they don't have lot data. So the
 * proof becomes the design rather than a claim sitting next to it.
 *
 * D · THE CERTIFICATE — the COA is the hero. A real document, monumentally set.
 * E · CHROMATOGRAM   — the HPLC trace as the brand's visual system.
 * F · SPECIMEN       — full-bleed macro, near-silent type, materials-brand register.
 *
 * Run: node scripts/build-home-concepts-2.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** A plausible HPLC trace, drawn as SVG so it scales and tints with the page. */
function chromatogram(w = 1600, h = 420, stroke = '#6B8AFF', op = 1) {
  const peaks = [
    [0.16, 0.10, 0.018], [0.33, 0.055, 0.012], [0.52, 0.97, 0.021],
    [0.63, 0.075, 0.011], [0.78, 0.13, 0.015], [0.88, 0.05, 0.010],
  ];
  const pts = [];
  for (let i = 0; i <= 900; i++) {
    const x = i / 900;
    let y = 0.012 + Math.sin(i / 7) * 0.0022; // baseline noise
    for (const [c, amp, sd] of peaks) y += amp * Math.exp(-((x - c) ** 2) / (2 * sd * sd));
    pts.push(`${(x * w).toFixed(1)},${(h - y * h * 0.94).toFixed(1)}`);
  }
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">
    <polyline fill="none" stroke="${stroke}" stroke-width="2.5" stroke-opacity="${op}"
      stroke-linejoin="round" points="${pts.join(' ')}"/>
  </svg>`;
}

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Merit — pushed directions</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Inter+Tight:wght@600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}html{scroll-behavior:smooth}
  body{margin:0;font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;background:#05070C}
  .rail{position:fixed;inset:0 0 auto;z-index:99;display:flex;gap:8px;align-items:center;padding:10px 20px;
        background:rgba(5,7,12,.92);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.12)}
  .rail b{color:#fff;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;margin-right:6px}
  .rail a{color:rgba(255,255,255,.6);font-size:12px;font-weight:600;text-decoration:none;padding:6px 12px;
          border:1px solid rgba(255,255,255,.18);border-radius:99px}
  .rail a:hover{color:#fff;border-color:rgba(255,255,255,.55)}
  .tag{padding:9px 22px;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase}
  .wrap{max-width:1340px;margin:0 auto;padding:0 40px}
  .mono{font-family:'JetBrains Mono',ui-monospace,monospace}
  section{min-height:100vh}

  /* ══ D · THE CERTIFICATE ═════════════════════════════════════════ */
  .D{background:#080A11;color:#fff;padding-top:44px}
  .D .tag{background:#121722;color:#8FA6FF}
  .D .grid{display:grid;grid-template-columns:1fr 500px;gap:80px;align-items:center;padding:96px 0 120px}
  .D .kick{margin:0 0 32px;font-size:11px;font-weight:600;letter-spacing:.26em;text-transform:uppercase;color:#6B8AFF}
  .D h1{margin:0;font-family:'Inter Tight',sans-serif;font-size:clamp(52px,6.2vw,104px);font-weight:800;
        line-height:.92;letter-spacing:-.045em}
  .D h1 span{display:block;color:rgba(255,255,255,.34)}
  .D .lede{margin:34px 0 0;max-width:44ch;font-size:17px;line-height:1.7;color:rgba(255,255,255,.6)}
  .D .btns{margin-top:40px;display:flex;gap:12px;flex-wrap:wrap}
  .D .b1{background:#2E4DDB;color:#fff;padding:16px 34px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none}
  .D .b2{border:1px solid rgba(255,255,255,.22);color:#fff;padding:16px 34px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none}
  /* the certificate object */
  .coa{background:#fff;color:#0B0F19;padding:34px 32px;box-shadow:0 60px 120px rgba(0,0,0,.6);
       transform:rotate(-1.2deg)}
  .coa .top{display:flex;justify-content:space-between;align-items:flex-start;
            border-bottom:2px solid #0B0F19;padding-bottom:14px}
  .coa .top b{font-size:17px;font-weight:800;letter-spacing:-.02em}
  .coa .top small{display:block;font-size:9.5px;letter-spacing:.2em;text-transform:uppercase;color:#94A0B0;margin-top:3px}
  .coa .seal{width:52px;height:52px;border-radius:50%;border:2px solid #2E4DDB;color:#2E4DDB;
             display:grid;place-items:center;font-size:8px;font-weight:800;letter-spacing:.08em;text-align:center;line-height:1.15}
  .coa h4{margin:20px 0 4px;font-size:22px;font-weight:800;letter-spacing:-.03em}
  .coa .sub{margin:0 0 18px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#94A0B0}
  .coa table{width:100%;border-collapse:collapse;font-size:12.5px}
  .coa td{padding:9px 0;border-bottom:1px solid #E6E8ED}
  .coa td:last-child{text-align:right;font-family:'JetBrains Mono',monospace;font-weight:600}
  .coa .pass{color:#1A8B3F}
  .coa .foot{display:flex;justify-content:space-between;margin-top:18px;font-size:10px;color:#94A0B0;letter-spacing:.06em}
  .D .trace{height:130px;opacity:.5;border-top:1px solid rgba(255,255,255,.09);
            border-bottom:1px solid rgba(255,255,255,.09)}

  /* ══ E · CHROMATOGRAM ════════════════════════════════════════════ */
  .E{background:#05070C;color:#fff;position:relative;overflow:hidden;padding-top:0}
  .E .tag{background:#0E1421;color:#8FA6FF}
  .E .bg{position:absolute;inset:auto 0 6% 0;height:52vh;opacity:.22;pointer-events:none}
  .E .inner{position:relative;padding:120px 0 96px}
  .E .kick{margin:0 0 40px;display:flex;gap:16px;align-items:center;font-size:11px;font-weight:600;
           letter-spacing:.24em;text-transform:uppercase;color:rgba(255,255,255,.42)}
  .E .kick i{width:56px;height:1px;background:rgba(255,255,255,.28);font-style:normal}
  .E .huge{margin:0;font-family:'Inter Tight',sans-serif;font-weight:800;letter-spacing:-.055em;
           line-height:.82;font-size:clamp(72px,13vw,220px)}
  .E .huge u{text-decoration:none;color:#6B8AFF}
  .E .under{display:grid;grid-template-columns:1.1fr .9fr;gap:64px;align-items:end;margin-top:56px}
  .E .lede{margin:0;max-width:42ch;font-size:18px;line-height:1.7;color:rgba(255,255,255,.6)}
  .E .readout{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,.12);
              border:1px solid rgba(255,255,255,.12)}
  .E .readout div{background:#05070C;padding:20px 18px}
  .E .readout dt{font-size:9.5px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.4)}
  .E .readout dd{margin:9px 0 0;font-family:'JetBrains Mono',monospace;font-size:21px;font-weight:700}
  .E .b1{display:inline-block;margin-top:48px;background:#fff;color:#05070C;padding:17px 38px;
         border-radius:4px;font-size:14px;font-weight:700;text-decoration:none}

  /* ══ F · SPECIMEN ════════════════════════════════════════════════ */
  .F{position:relative;color:#fff;overflow:hidden;background:#04060A}
  .F .tag{background:#0A0D14;color:#8FA6FF;position:relative;z-index:3}
  .F .shot{position:absolute;inset:0}
  .F .shot img{width:100%;height:100%;object-fit:cover}
  .F .scrim{position:absolute;inset:0;background:linear-gradient(90deg,rgba(4,6,10,.94) 0%,rgba(4,6,10,.72) 42%,rgba(4,6,10,.15) 78%)}
  .F .inner{position:relative;z-index:2;display:flex;flex-direction:column;justify-content:center;
            min-height:calc(100vh - 44px);padding:96px 0}
  .F .kick{margin:0 0 30px;font-size:10.5px;font-weight:600;letter-spacing:.3em;text-transform:uppercase;color:rgba(255,255,255,.55)}
  .F h1{margin:0;max-width:13ch;font-family:'Inter Tight',sans-serif;font-size:clamp(48px,6vw,96px);
        font-weight:700;line-height:.98;letter-spacing:-.04em}
  .F .lede{margin:30px 0 0;max-width:38ch;font-size:16.5px;line-height:1.72;color:rgba(255,255,255,.66)}
  .F .b1{display:inline-block;margin-top:40px;border:1px solid rgba(255,255,255,.35);color:#fff;
         padding:16px 36px;font-size:13px;font-weight:600;letter-spacing:.06em;text-decoration:none}
  .F .b1:hover{background:#fff;color:#04060A}
  .F .ledger{position:absolute;left:0;right:0;bottom:0;z-index:2;border-top:1px solid rgba(255,255,255,.14);
             background:rgba(4,6,10,.6);backdrop-filter:blur(6px)}
  .F .ledger .wrap{display:flex;justify-content:space-between;gap:24px;padding-top:18px;padding-bottom:18px;flex-wrap:wrap}
  .F .ledger span{font-family:'JetBrains Mono',monospace;font-size:11.5px;color:rgba(255,255,255,.62);letter-spacing:.04em}
  .F .ledger span b{color:#fff;font-weight:600}

  @media(max-width:1000px){
    .D .grid,.E .under{grid-template-columns:1fr}
    .E .readout{grid-template-columns:1fr}
  }
</style></head><body>

<nav class="rail"><b>Merit · pushed</b>
  <a href="#d">D · Certificate</a><a href="#e">E · Chromatogram</a><a href="#f">F · Specimen</a>
</nav>

<!-- ══════ D ══════ -->
<section class="D" id="d">
  <div class="tag">D · The certificate — the proof IS the hero</div>
  <div class="wrap grid">
    <div>
      <p class="kick">Merit Sciences · Dallas, Texas</p>
      <h1>We publish<br>the paperwork.<span>Nobody else does.</span></h1>
      <p class="lede">Every Merit lot is tested by an independent laboratory and its certificate is
        published before the lot ships — identity, purity, endotoxin, moisture. Not on request. Not
        on file. Public.</p>
      <div class="btns">
        <a class="b1" href="#">Shop the catalog</a>
        <a class="b2" href="#">Browse every lot report →</a>
      </div>
    </div>

    <figure class="coa" style="margin:0">
      <div class="top">
        <div><b>Certificate of Analysis</b><small>Independent laboratory</small></div>
        <div class="seal">PASS<br>2026</div>
      </div>
      <h4>Tirzepatide 30 mg</h4>
      <p class="sub">Lot LOT2026-06-0001</p>
      <table>
        <tr><td>Identity (HPLC-MS)</td><td class="pass">Conforms</td></tr>
        <tr><td>Purity (HPLC)</td><td>99.31%</td></tr>
        <tr><td>Related substances</td><td>0.69%</td></tr>
        <tr><td>Endotoxin (LAL)</td><td>&lt; 0.05 EU/mg</td></tr>
        <tr><td>Water content (KF)</td><td>2.1%</td></tr>
        <tr><td>Appearance</td><td class="pass">Conforms</td></tr>
      </table>
      <div class="foot"><span>Released 2026-06-14</span><span>meritsciences.com/coa</span></div>
    </figure>
  </div>
  <div class="trace">${chromatogram(1600, 130, '#6B8AFF', 0.85)}</div>
</section>

<!-- ══════ E ══════ -->
<section class="E" id="e">
  <div class="tag">E · Chromatogram — the trace as the brand system</div>
  <div class="bg">${chromatogram(1600, 420, '#2E4DDB', 1)}</div>
  <div class="wrap inner">
    <p class="kick"><i></i> Lot LOT2026-06-0001 · released 14 June 2026</p>
    <h1 class="huge">99.31<u>%</u></h1>
    <div class="under">
      <p class="lede">That is the measured purity of the lot currently shipping — not a specification,
        not a target, not a typical value. The number from the assay, published the day it was run.</p>
      <dl class="readout">
        <div><dt>Endotoxin</dt><dd>&lt;0.05</dd></div>
        <div><dt>Water (KF)</dt><dd>2.1%</dd></div>
        <div><dt>Released</dt><dd>48 hrs</dd></div>
      </dl>
    </div>
    <a class="b1" href="#">See the full report →</a>
  </div>
</section>

<!-- ══════ F ══════ -->
<section class="F" id="f">
  <div class="tag">F · Specimen — full-bleed macro, materials-brand restraint</div>
  <div class="shot">
    <img src="/brand/macro/cake-macro.png" alt="" onerror="this.src='/brand/merit-vial-hero.webp'">
    <div class="scrim"></div>
  </div>
  <div class="wrap inner">
    <p class="kick">Lyophilized · sealed · verified</p>
    <h1>What's in the vial is the whole argument.</h1>
    <p class="lede">Compounded by a US-licensed pharmacy team in Dallas. Tested by an independent lab.
      Sealed, sterile, and documented before it ships.</p>
    <a class="b1" href="#">Shop the catalog</a>
  </div>
  <div class="ledger"><div class="wrap">
    <span>LOT <b>2026-06-0001</b></span><span>PURITY <b>99.31%</b></span>
    <span>ENDOTOXIN <b>&lt;0.05 EU/mg</b></span><span>RELEASED <b>2026-06-14</b></span>
  </div></div>
</section>

</body></html>`;

writeFileSync(join(ROOT, 'public', 'home-concepts-2.html'), html, 'utf8');
console.log('wrote public/home-concepts-2.html');
