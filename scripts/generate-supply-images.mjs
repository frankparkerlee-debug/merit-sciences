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
import { CATALOG } from './supply-catalog.mjs';
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
 * The container silhouette. A hydrogel tube is not a pouch and a bottle of
 * cleanser is not a dressing — drawing them all as the same flat rectangle
 * would make a 50-SKU shelf unreadable, and would quietly misrepresent what
 * arrives in the box.
 */
function vessel(form, accent) {
  const crimp = (y) =>
    `<rect x="128" y="${y}" width="384" height="34" rx="10" fill="#E9ECF1"/>
     <g stroke="${INK_MUTED}" stroke-width="1" opacity="0.45">
       ${Array.from({ length: 24 }, (_, i) => `<line x1="${140 + i * 16}" y1="${y + 6}" x2="${140 + i * 16}" y2="${y + 28}"/>`).join('')}
     </g>`;

  switch (form) {
    case 'bottle':
      return `
    <rect x="286" y="60" width="68" height="30" rx="5" fill="#DDE1E8" stroke="${BORDER}" stroke-width="2"/>
    <rect x="300" y="86" width="40" height="24" fill="#E9ECF1"/>
    <rect x="128" y="106" width="384" height="438" rx="26" fill="url(#foil)" stroke="${BORDER}" stroke-width="2"/>
    <rect x="128" y="150" width="8" height="394" fill="${accent}"/>`;
    case 'tube':
      return `
    <rect x="296" y="58" width="48" height="34" rx="6" fill="#DDE1E8" stroke="${BORDER}" stroke-width="2"/>
    <rect x="128" y="88" width="384" height="456" rx="30" fill="url(#foil)" stroke="${BORDER}" stroke-width="2"/>
    ${crimp(508)}
    <rect x="128" y="150" width="8" height="358" fill="${accent}"/>`;
    case 'roll':
      return `
    <rect x="128" y="112" width="384" height="432" rx="14" fill="url(#foil)" stroke="${BORDER}" stroke-width="2"/>
    <ellipse cx="320" cy="112" rx="192" ry="26" fill="#F1F3F6" stroke="${BORDER}" stroke-width="2"/>
    <ellipse cx="320" cy="112" rx="74" ry="10" fill="#E4E7ED"/>
    <rect x="128" y="150" width="8" height="394" fill="${accent}"/>`;
    case 'box':
      return `
    <rect x="128" y="96" width="384" height="448" rx="6" fill="url(#foil)" stroke="${BORDER}" stroke-width="2"/>
    <line x1="128" y1="150" x2="512" y2="150" stroke="${BORDER}" stroke-width="2"/>
    <rect x="128" y="150" width="8" height="394" fill="${accent}"/>`;
    default: // pouch
      return `
    <rect x="128" y="96" width="384" height="448" rx="10" fill="url(#foil)" stroke="${BORDER}" stroke-width="2"/>
    ${crimp(96)}
    <rect x="128" y="150" width="8" height="394" fill="${accent}"/>`;
  }
}

/**
 * Deliberately flat and diagrammatic: a spec card wearing a package shape, not
 * a photograph pretending to be one.
 */
function packageSvg({ title, subtitle, size, hcpcs, category, sterile, rx, form }) {
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

  <g>${vessel(form, accent)}
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

  ${rx
    ? `<text x="168" y="516" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="500" fill="${INK_MUTED}">Rx only — for use by or on the order of a licensed practitioner</text>`
    : `<text x="168" y="516" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="500" fill="${INK_MUTED}">Supplied to licensed clinicians and healthcare facilities</text>`}
</svg>
`;
}

let n = 0;
for (const p of CATALOG) {
  writeFileSync(
    join(OUT, `${p.file}.svg`),
    packageSvg({
      title: p.type,
      subtitle: p.blurb.split('.')[0],
      size: p.size,
      hcpcs: p.hcpcs,
      category: p.cat,
      // Not everything is sterile — barrier creams, tapes and elastic wraps
      // aren't, and claiming sterility on a non-sterile product is a labeling
      // defect, not a design detail.
      sterile: p.sterile !== false,
      // Only the collagen line is Rx. Stamping "Rx only" on a dressing that
      // isn't would be a false statement on a device package.
      rx: p.rx,
      form: p.form,
    }),
    'utf8',
  );
  n++;
}
console.log(`wrote ${n} product images to public/supply/`);
