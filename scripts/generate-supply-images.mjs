/**
 * Generate product imagery for the Merit Clinical supply line.
 *
 * Programmatic SVG, not AI photography — deliberately. These are medical
 * devices we have not yet received from a supplier, and a photorealistic image
 * of a product that doesn't exist in that form is a misbranding problem, not
 * just a design shortcut. A clean package render reads as a rendering, states
 * only what is factually true (name, size, HCPCS, sterility), and is replaced
 * by real photography once inventory lands.
 *
 * Same approach already used for the Merit label artwork.
 *
 * Run: node scripts/generate-supply-images.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'supply');
mkdirSync(OUT, { recursive: true });

const INK = '#0B0F19';
const INK_SOFT = '#4A5160';
const INK_MUTED = '#94A0B0';
const COBALT = '#2E4DDB';
const CREAM = '#F4F1EA';
const BORDER = '#E2E5EB';

/** Accent per category, so a shelf of these is scannable at a glance. */
const ACCENT = {
  COLLAGEN: COBALT,
  WOUND_CARE: '#0E7C86', // teal — distinct from cobalt without leaving the palette
  DME: '#1E2330',
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * A pouch-style package render. Deliberately flat and diagrammatic: it is a
 * spec card wearing a package shape, not a photograph pretending to be one.
 */
function packageSvg({ title, subtitle, size, hcpcs, category, sterile }) {
  const accent = ACCENT[category] ?? COBALT;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="640" height="640" role="img" aria-label="${esc(title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="${CREAM}"/>
    </linearGradient>
    <linearGradient id="foil" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="0.45" stop-color="#F7F8FA"/>
      <stop offset="0.55" stop-color="#EDEFF3"/>
      <stop offset="1" stop-color="#F7F8FA"/>
    </linearGradient>
  </defs>

  <rect width="640" height="640" fill="url(#bg)"/>

  <!-- pouch body -->
  <g>
    <rect x="128" y="96" width="384" height="448" rx="10" fill="url(#foil)" stroke="${BORDER}" stroke-width="2"/>
    <!-- sealed top crimp -->
    <rect x="128" y="96" width="384" height="34" rx="10" fill="#E9ECF1"/>
    <g stroke="${INK_MUTED}" stroke-width="1" opacity="0.45">
      ${Array.from({ length: 24 }, (_, i) => `<line x1="${140 + i * 16}" y1="102" x2="${140 + i * 16}" y2="124"/>`).join('')}
    </g>
    <!-- accent spine -->
    <rect x="128" y="150" width="8" height="394" fill="${accent}"/>
  </g>

  <!-- wordmark -->
  <text x="168" y="196" font-family="Inter, system-ui, sans-serif" font-size="27" font-weight="800" fill="${INK}" letter-spacing="-0.5">Merit<tspan fill="${accent}">.</tspan></text>
  <text x="168" y="216" font-family="Inter, system-ui, sans-serif" font-size="10.5" font-weight="700" fill="${INK_MUTED}" letter-spacing="3">CLINICAL</text>

  <!-- product name -->
  <text x="168" y="288" font-family="Inter, system-ui, sans-serif" font-size="30" font-weight="800" fill="${INK}" letter-spacing="-0.7">${esc(title)}</text>
  ${subtitle ? `<text x="168" y="316" font-family="Inter, system-ui, sans-serif" font-size="15" font-weight="500" fill="${INK_SOFT}">${esc(subtitle)}</text>` : ''}

  <!-- size, the thing a buyer scans for -->
  <text x="168" y="392" font-family="Inter, system-ui, sans-serif" font-size="46" font-weight="800" fill="${accent}" letter-spacing="-1.5">${esc(size)}</text>

  <!-- spec rail -->
  <line x1="168" y1="424" x2="472" y2="424" stroke="${BORDER}" stroke-width="2"/>
  ${hcpcs ? `<text x="168" y="454" font-family="ui-monospace, monospace" font-size="14" font-weight="600" fill="${INK_SOFT}">HCPCS ${esc(hcpcs)}</text>` : ''}
  ${sterile ? `<text x="168" y="480" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="700" fill="${INK_SOFT}" letter-spacing="1.5">STERILE · SINGLE USE</text>` : ''}

  <text x="168" y="516" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="500" fill="${INK_MUTED}">Rx only — for use by or on the order of a licensed practitioner</text>
</svg>
`;
}

const PRODUCTS = [
  { file: 'collagen-matrix-7x7',       title: 'Collagen Matrix',   subtitle: 'Native collagen wound dressing', size: '7" × 7"',       hcpcs: 'A6023', category: 'COLLAGEN',   sterile: true },
  { file: 'collagen-matrix-4x4',       title: 'Collagen Matrix',   subtitle: 'Native collagen wound dressing', size: '4" × 4"',       hcpcs: 'A6022', category: 'COLLAGEN',   sterile: true },
  { file: 'collagen-matrix-2x2',       title: 'Collagen Matrix',   subtitle: 'Native collagen wound dressing', size: '2" × 2"',       hcpcs: 'A6021', category: 'COLLAGEN',   sterile: true },
  { file: 'collagen-particulate-1g',   title: 'Collagen Particulate', subtitle: 'For tunneling and irregular wounds', size: '1 g',    hcpcs: 'A6010', category: 'COLLAGEN',   sterile: true },
  { file: 'calcium-alginate-2x2',      title: 'Calcium Alginate',  subtitle: 'Moderate to heavy exudate',      size: '2" × 2"',       hcpcs: 'A6196', category: 'WOUND_CARE', sterile: true },
  { file: 'calcium-alginate-4x4',      title: 'Calcium Alginate',  subtitle: 'Moderate to heavy exudate',      size: '4.33" × 4.33"', hcpcs: 'A6197', category: 'WOUND_CARE', sterile: true },
  { file: 'calcium-alginate-rope',     title: 'Alginate Rope',     subtitle: 'Packing for tunneling wounds',   size: '2 g',           hcpcs: 'A6199', category: 'WOUND_CARE', sterile: true },
  { file: 'silver-alginate-2x2',       title: 'Silver Alginate',   subtitle: 'Ionic silver, antimicrobial',    size: '2" × 2"',       hcpcs: 'A6196', category: 'WOUND_CARE', sterile: true },
  { file: 'silver-alginate-4x4',       title: 'Silver Alginate',   subtitle: 'Ionic silver, antimicrobial',    size: '4.33" × 4.33"', hcpcs: 'A6197', category: 'WOUND_CARE', sterile: true },
  { file: 'silicone-foam-4x4',         title: 'Silicone Foam',     subtitle: 'Bordered, atraumatic adhesive',  size: '4" × 4"',       hcpcs: 'A6213', category: 'WOUND_CARE', sterile: true },
  { file: 'silicone-foam-sacral',      title: 'Sacral Foam',       subtitle: 'Contoured, bordered silicone',   size: '9" × 9"',       hcpcs: 'A6214', category: 'WOUND_CARE', sterile: true },
  { file: 'super-absorbent-4x4',       title: 'Super Absorbent',   subtitle: 'Non-adherent, heavy exudate',    size: '4" × 4"',       hcpcs: 'A6252', category: 'WOUND_CARE', sterile: true },
];

let n = 0;
for (const p of PRODUCTS) {
  writeFileSync(join(OUT, `${p.file}.svg`), packageSvg(p), 'utf8');
  n++;
}
console.log(`wrote ${n} product images to public/supply/`);
