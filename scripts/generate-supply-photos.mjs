/**
 * Generate clinical product photography for the Merit Clinical catalog.
 *
 * One image per distinct product FORM, not per SKU — a 2x2 and a 4x4 alginate
 * are the same object at different sizes, and the size is already stated in
 * type on the page. 24 forms cover 50 SKUs.
 *
 * House style, held constant across every prompt so the grid reads as one
 * catalog rather than 24 unrelated shots: seamless white, soft diffused studio
 * light, gentle contact shadow, three-quarter overhead, no props, no packaging,
 * no text, no logos, no hands. The reference is Molnlycke / Coloplast catalog
 * photography — sterile, precise, understated.
 *
 * Run: node scripts/generate-supply-photos.mjs [onlyKey]
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'supply', 'photo');
mkdirSync(OUT, { recursive: true });

function apiKey() {
  for (const p of [join(ROOT, '..', '.env'), join(ROOT, '.env'), join(ROOT, '.env.local')]) {
    if (!existsSync(p)) continue;
    const m = readFileSync(p, 'utf8').match(/^OPENAI_API_KEY=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('OPENAI_API_KEY not found');
}

const STYLE =
  'Seamless pure white studio background, even soft diffused lighting from above, ' +
  'subtle contact shadow, three-quarter overhead angle, sharp focus, high detail, ' +
  'neutral color, no props, no packaging, no text, no logos, no hands, no people. ' +
  'Clinical product photography for a medical device supplier catalog — sterile, ' +
  'precise, understated, in the visual language of Molnlycke or Coloplast.';

/** key → subject description. Keys map to SKUs in PHOTO_MAP below. */
const FORMS = {
  alginate: 'A single sterile calcium alginate wound dressing square, off-white fibrous non-woven material with a soft matte texture, lying flat and slightly angled.',
  'alginate-silver': 'A single sterile silver alginate wound dressing square, pale grey-white fibrous non-woven material with a faint metallic sheen, lying flat and slightly angled.',
  'alginate-rope': 'A coiled sterile alginate wound packing rope, off-white soft fibrous cord loosely coiled once, lying flat.',
  'gelling-fiber': 'A single sterile gelling fibre wound dressing square, bright white smooth non-woven sheet with fine parallel fibre texture, lying flat and slightly angled.',
  'collagen-sheet': 'A single sterile collagen wound dressing sheet, pale cream porous sponge-like matrix with a fine open-cell surface, roughly 3mm thick, lying flat and slightly angled.',
  'collagen-particulate': 'A small neat mound of fine pale cream collagen powder on a clean white surface, softly lit, shallow depth of field.',
  'gel-tube': 'A plain unlabelled white medical gel tube with a white flip cap, standing upright, clean matte plastic, no printing of any kind.',
  'foam-bordered': 'A single bordered silicone foam wound dressing, soft white foam pad centred on a slightly larger translucent adhesive border with rounded corners, lying flat.',
  'foam-sacral': 'A sacral-shaped bordered silicone foam wound dressing, butterfly or heart shaped white foam pad with a translucent adhesive border, lying flat.',
  'foam-heel': 'A heel-shaped bordered silicone foam wound dressing, cupped anatomical white foam form with a translucent adhesive border, lying flat.',
  'super-absorbent': 'A super absorbent wound pad, thick soft white quilted rectangular pad with a smooth non-adherent face and visible edge stitching, lying flat.',
  'contact-layer': 'A silicone wound contact layer, thin translucent flexible sheet perforated with a regular grid of small round holes, faint blue-grey tint, lying flat.',
  hydrocolloid: 'A hydrocolloid wound dressing, thin translucent amber-tinted flexible square with softly tapered bevelled edges, lying flat.',
  'transparent-film': 'A transparent adhesive film wound dressing, ultra thin clear flexible sheet with a faint edge, lying flat and barely visible against white.',
  'gauze-bordered': 'A bordered gauze island dressing, small white absorbent gauze pad centred on a larger white adhesive fabric backing, lying flat.',
  'gauze-sponge': 'A stack of two folded sterile white cotton gauze sponges, soft woven texture with visible weave, lying flat and slightly offset.',
  'gauze-petrolatum': 'A petrolatum impregnated gauze strip, open-weave mesh gauze with a faint translucent glossy coating, loosely folded, lying flat.',
  'packing-strip': 'A loosely coiled narrow gauze packing strip, thin white woven ribbon coiled into a soft spiral, lying flat.',
  'abdominal-pad': 'A large abdominal wound pad, thick white rectangular absorbent pad with sealed edges and a smooth outer facing, lying flat.',
  'bottle-spray': 'A plain unlabelled white medical spray bottle with a white trigger-free fine mist cap, standing upright, clean matte plastic, no printing of any kind.',
  'wipes-box': 'A plain unlabelled white medical wipes carton, small rectangular box standing upright with a closed dispensing flap, clean matte board, no printing of any kind.',
  'bandage-roll': 'A rolled elastic compression bandage, soft off-white woven fabric roll standing on its end with the free end draping slightly, unlabelled.',
  'tape-roll': 'A roll of white medical adhesive tape on a plain white core, standing on its end, unlabelled, clean matte surface.',
  'npwt-kit': 'A negative pressure wound therapy dressing set laid out flat: a block of reticulated black open-cell foam, a folded clear adhesive drape, and a round suction pad with clear tubing, arranged neatly, unlabelled.',
  'npwt-canister': 'A plain unlabelled clear medical suction canister with white cap and graduated markings moulded into the plastic, standing upright, empty.',
};

/** Which catalog file(s) use each form. */
export const PHOTO_MAP = {
  alginate: ['calcium-alginate-2x2', 'calcium-alginate-4x4', 'calcium-alginate-6x6'],
  'alginate-silver': ['silver-alginate-2x2', 'silver-alginate-4x4', 'phmb-alginate-4x4'],
  'alginate-rope': ['alginate-rope', 'silver-alginate-rope'],
  'gelling-fiber': ['gelling-fiber-2x2', 'gelling-fiber-4x4'],
  'collagen-sheet': ['collagen-matrix-2x2', 'collagen-matrix-4x4', 'collagen-matrix-7x7'],
  'collagen-particulate': ['collagen-particulate'],
  'gel-tube': ['collagen-gel-1oz', 'hydrogel-3oz', 'silver-hydrogel-3oz', 'barrier-cream-4oz'],
  'foam-bordered': ['silicone-foam-2x2', 'silicone-foam-4x4', 'silicone-foam-6x6'],
  'foam-sacral': ['sacral-foam'],
  'foam-heel': ['heel-foam'],
  'super-absorbent': ['super-absorbent-4x4', 'super-absorbent-8x8'],
  'contact-layer': ['contact-layer-3x4', 'contact-layer-6x8'],
  hydrocolloid: ['hydrocolloid-2x2', 'hydrocolloid-4x4', 'hydrogel-sheet-4x4'],
  'transparent-film': ['transparent-film-4x5', 'transparent-film-6x8'],
  'gauze-bordered': ['bordered-gauze-4x4', 'bordered-gauze-6x6', 'composite-4x4'],
  'gauze-sponge': ['gauze-sponge-4x4', 'hydrogel-gauze-4x4'],
  'gauze-petrolatum': ['petrolatum-gauze-3x8'],
  'packing-strip': ['iodoform-packing'],
  'abdominal-pad': ['abdominal-pad-8x10'],
  'bottle-spray': ['wound-cleanser-8oz', 'saline-wash-7oz'],
  'wipes-box': ['barrier-film-wipes'],
  'bandage-roll': ['elastic-bandage-4in', 'cohesive-wrap-4in', 'undercast-padding-4in'],
  'tape-roll': ['paper-tape-2in', 'silicone-tape-2in'],
  'npwt-kit': ['npwt-dressing-kit'],
  'npwt-canister': ['npwt-canister-250'],
};

async function one(key, subject, KEY) {
  const dest = join(OUT, `${key}.png`);
  if (existsSync(dest)) return 'skip';
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: `${subject} ${STYLE}`,
      size: '1024x1024',
      quality: 'high',
      n: 1,
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${key}: ${json.error.message}`);
  writeFileSync(dest, Buffer.from(json.data[0].b64_json, 'base64'));
  return 'ok';
}

if (process.argv[1] && process.argv[1].endsWith('generate-supply-photos.mjs')) {
  const KEY = apiKey();
  const only = process.argv[2];
  const entries = Object.entries(FORMS).filter(([k]) => !only || k === only);
  let ok = 0, skip = 0;
  for (const [key, subject] of entries) {
    try {
      const r = await one(key, subject, KEY);
      r === 'ok' ? ok++ : skip++;
      console.log(`${r === 'ok' ? '✓' : '·'} ${key}`);
    } catch (err) {
      console.error(`✗ ${key}: ${err.message}`);
    }
  }
  console.log(`\ngenerated ${ok}, skipped ${skip}`);
}
