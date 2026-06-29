// Representative HPLC chromatogram, generated deterministically from a lot's
// verified purity. This is a VISUALIZATION of the reported purity — one dominant
// peak, with small peaks standing in for the impurity remainder — NOT the raw
// instrument trace. To show a real trace, upload a lab-redacted chromatogram
// image instead (it overrides this). Deterministic per lot (seeded by lotId), so
// the same lot always renders the same curve and lots look distinct from each other.

function rngFromString(s: string): () => number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildChromatogram(purity: number, seed: string) {
  const W = 440, H = 132, padL = 6, padR = 6, padT = 16, padB = 16;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const rnd = rngFromString(seed || 'merit');
  const p = isFinite(purity) && purity > 0 ? Math.min(purity, 100) : 99;

  const mainMu = 0.5 + (rnd() - 0.5) * 0.14;
  const peaks: { mu: number; sigma: number; amp: number }[] = [{ mu: mainMu, sigma: 0.02, amp: 1 }];
  const impurity = Math.max(0, 100 - p) / 100;
  const nMinor = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < nMinor; i++) {
    const mu = 0.1 + rnd() * 0.8;
    if (Math.abs(mu - mainMu) < 0.07) continue;
    peaks.push({ mu, sigma: 0.008 + rnd() * 0.007, amp: (0.015 + rnd() * 0.05) * (1 + impurity * 25) });
  }

  const N = 220;
  const ys: number[] = [];
  let maxY = 1e-6;
  for (let i = 0; i <= N; i++) {
    const x = i / N;
    let y = 0;
    for (const pk of peaks) y += pk.amp * Math.exp(-((x - pk.mu) ** 2) / (2 * pk.sigma * pk.sigma));
    ys.push(y);
    if (y > maxY) maxY = y;
  }
  const pts = ys.map((y, i) => [padL + (i / N) * plotW, padT + plotH - (y / maxY) * plotH * 0.9] as const);
  const line = pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('');
  const baseY = padT + plotH;
  const area = `${line}L${(padL + plotW).toFixed(1)} ${baseY.toFixed(1)}L${padL.toFixed(1)} ${baseY.toFixed(1)}Z`;
  const mainX = padL + mainMu * plotW;
  const mainTopY = padT + plotH - 0.9 * plotH;
  return { W, H, padL, plotW, baseY, line, area, mainX, mainTopY, purity: p };
}

export function Chromatogram({ purity, seed }: { purity: number; seed: string }) {
  const c = buildChromatogram(purity, seed);
  return (
    <svg
      viewBox={`0 0 ${c.W} ${c.H}`}
      className="w-full h-auto text-cobalt"
      role="img"
      aria-label={`Representative HPLC chromatogram, ${c.purity}% main peak`}
    >
      <line x1={c.padL} y1={c.baseY} x2={c.padL + c.plotW} y2={c.baseY} stroke="currentColor" strokeOpacity="0.18" />
      <path d={c.area} fill="currentColor" fillOpacity="0.08" />
      <path d={c.line} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
      <line x1={c.mainX} y1={c.mainTopY} x2={c.mainX} y2={c.baseY} stroke="currentColor" strokeOpacity="0.22" strokeDasharray="2 2" />
      <text x={c.mainX} y={c.mainTopY - 4} textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="700">
        {c.purity}%
      </text>
    </svg>
  );
}
