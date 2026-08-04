/**
 * Merit Clinical catalog — SINGLE SOURCE OF TRUTH.
 *
 * The image generator, the seed SQL, and the preview builder all read this.
 * The list previously lived in three places and had already begun to drift.
 *
 * ── NAMING CONVENTION ────────────────────────────────────────────────────
 *
 * Brand:   "Merit Clinical" — house brand, generic descriptors, no invented
 *          family names. Clinics search by what a thing IS ("silver alginate
 *          4x4"), not by a coined name, and a descriptor carries no trademark
 *          risk. NOTE: "Merit Medical" is unavailable — Merit Medical Systems
 *          (NASDAQ: MMSI) is a large public device company in this category.
 *
 * Title:   "<Type> · <Size>"            e.g. "Silver Alginate · 4.33\" × 4.33\""
 * Handle:  merit-<type-slug>-<size>     e.g. merit-silver-alginate-4x4
 *
 * REF:     M<FAMILY>-<SIZE><VARIANT>
 *          ├ FAMILY  one letter, the material family
 *          │   C collagen · A alginate · G gelling fibre · F foam
 *          │   S super absorbent · L contact layer · H hydrocolloid
 *          │   T transparent film · Z gauze
 *          ├ SIZE    4 digits, inches × 100 rounded — 0202 = 2×2, 0433 = 4.33×4.33,
 *          │         0707 = 7×7. Non-dimensional forms use a word (ROPE, PART).
 *          └ VARIANT 2–3 letters disambiguating within the family
 *              CS collagen sheet · CP collagen particulate
 *              CA calcium alginate · SA silver alginate · PA PHMB alginate
 *              SFB silicone foam bordered · SAC sacral · HEL heel
 *              SAN super absorbent non-adherent · SAA super absorbent adherent
 *              SCL silicone contact layer · HCD hydrocolloid
 *              TFD transparent film · BGZ bordered gauze
 *
 *          Reads left to right as family → size → variant, sorts sensibly in a
 *          spreadsheet, and extends without renumbering.
 *
 * ⚠️  HCPCS codes below are ASSIGNED FROM THE CODE DEFINITIONS, not verified.
 *     Only A6021 ($29.97), A6023 ($141–314 by payer) and A6196 ($10.49) have
 *     had their allowables confirmed. Every code must be validated through
 *     PDAC Coding Verification Review before this catalog is sold — PDAC
 *     assigns the billable code, and a wrong code on a product page causes a
 *     clinic to misbill.
 */

/** cat: COLLAGEN | WOUND_CARE | DME */
export const CATALOG = [
  // ── Collagen ────────────────────────────────────────────────────────────
  { file: 'collagen-matrix-2x2',   type: 'Collagen Matrix',      size: '2" × 2"',       ref: 'MC-0202CS', hcpcs: 'A6021', cat: 'COLLAGEN',   cents: 1300, box: 10, rx: true,  eyebrow: 'Native collagen', blurb: 'Native collagen matrix for small and digit wounds.' },
  { file: 'collagen-matrix-4x4',   type: 'Collagen Matrix',      size: '4" × 4"',       ref: 'MC-0404CS', hcpcs: 'A6022', cat: 'COLLAGEN',   cents: 4500, box: 10, rx: true,  eyebrow: 'Native collagen', blurb: 'Native collagen matrix for moderate wound geometry.' },
  { file: 'collagen-matrix-7x7',   type: 'Collagen Matrix',      size: '7" × 7"',       ref: 'MC-0707CS', hcpcs: 'A6023', cat: 'COLLAGEN',   cents: 9000, box: 10, rx: true,  eyebrow: 'Native collagen', blurb: 'Native collagen matrix for large wounds. At 49 sq in it codes to A6023.' },
  { file: 'collagen-particulate',  type: 'Collagen Particulate', size: '1 g',           ref: 'MC-PARTCP', hcpcs: 'A6010', cat: 'COLLAGEN',   cents: 1750, box: 10, rx: true,  eyebrow: 'Particulate',     blurb: 'Particulate collagen for tunneling, undermined, or irregular wound geometry.' },

  // ── Alginate ────────────────────────────────────────────────────────────
  { file: 'calcium-alginate-2x2',  type: 'Calcium Alginate',     size: '2" × 2"',       ref: 'MA-0202CA', hcpcs: 'A6196', cat: 'WOUND_CARE', cents:  280, box: 10, rx: false, eyebrow: 'Alginate',        blurb: 'Highly absorbent calcium alginate for moderate to heavy exudate. Gels on contact.' },
  { file: 'calcium-alginate-4x4',  type: 'Calcium Alginate',     size: '4.33" × 4.33"', ref: 'MA-0433CA', hcpcs: 'A6197', cat: 'WOUND_CARE', cents:  440, box: 10, rx: false, eyebrow: 'Alginate',        blurb: 'Highly absorbent calcium alginate for moderate to heavy exudate. Gels on contact.' },
  { file: 'calcium-alginate-6x6',  type: 'Calcium Alginate',     size: '6" × 6"',       ref: 'MA-0606CA', hcpcs: 'A6198', cat: 'WOUND_CARE', cents:  620, box: 10, rx: false, eyebrow: 'Alginate',        blurb: 'Highly absorbent calcium alginate for large, heavily exuding wounds.' },
  { file: 'alginate-rope',         type: 'Alginate Rope',        size: '2 g',           ref: 'MA-ROPECA', hcpcs: 'A6199', cat: 'WOUND_CARE', cents:  550, box: 10, rx: false, eyebrow: 'Alginate',        blurb: 'Alginate rope for packing tunneling and undermined wounds.' },
  { file: 'silver-alginate-2x2',   type: 'Silver Alginate',      size: '2" × 2"',       ref: 'MA-0202SA', hcpcs: 'A6196', cat: 'WOUND_CARE', cents:  310, box: 10, rx: false, eyebrow: 'Antimicrobial',   blurb: 'Calcium alginate with ionic silver where antimicrobial action is indicated.' },
  { file: 'silver-alginate-4x4',   type: 'Silver Alginate',      size: '4.33" × 4.33"', ref: 'MA-0433SA', hcpcs: 'A6197', cat: 'WOUND_CARE', cents:  520, box: 10, rx: false, eyebrow: 'Antimicrobial',   blurb: 'Calcium alginate with ionic silver where antimicrobial action is indicated.' },
  { file: 'silver-alginate-rope',  type: 'Silver Alginate Rope', size: '2 g',           ref: 'MA-ROPESA', hcpcs: 'A6199', cat: 'WOUND_CARE', cents:  680, box: 10, rx: false, eyebrow: 'Antimicrobial',   blurb: 'Silver alginate rope for packing infected or at-risk cavity wounds.' },
  { file: 'phmb-alginate-4x4',     type: 'PHMB Alginate',        size: '4.33" × 4.33"', ref: 'MA-0433PA', hcpcs: 'A6197', cat: 'WOUND_CARE', cents:  540, box: 10, rx: false, eyebrow: 'Antimicrobial',   blurb: 'Calcium alginate with PHMB as a silver-free antimicrobial option.' },

  // ── Gelling fibre ───────────────────────────────────────────────────────
  { file: 'gelling-fiber-2x2',     type: 'Gelling Fiber',        size: '2" × 2"',       ref: 'MG-0202GF', hcpcs: 'A6196', cat: 'WOUND_CARE', cents:  340, box: 10, rx: false, eyebrow: 'Gelling fiber',   blurb: 'Carboxymethylcellulose gelling fiber. Locks exudate into the gel to protect periwound skin.' },
  { file: 'gelling-fiber-4x4',     type: 'Gelling Fiber',        size: '4" × 4"',       ref: 'MG-0404GF', hcpcs: 'A6197', cat: 'WOUND_CARE', cents:  590, box: 10, rx: false, eyebrow: 'Gelling fiber',   blurb: 'Carboxymethylcellulose gelling fiber. Locks exudate into the gel to protect periwound skin.' },

  // ── Foam ────────────────────────────────────────────────────────────────
  { file: 'silicone-foam-2x2',     type: 'Silicone Foam',        size: '2" × 2"',       ref: 'MF-0202SFB', hcpcs: 'A6212', cat: 'WOUND_CARE', cents: 300, box: 10, rx: false, eyebrow: 'Foam',           blurb: 'Bordered silicone foam for moderate exudate. Atraumatic adhesive allows repositioning.' },
  { file: 'silicone-foam-4x4',     type: 'Silicone Foam',        size: '4" × 4"',       ref: 'MF-0404SFB', hcpcs: 'A6213', cat: 'WOUND_CARE', cents: 500, box: 10, rx: false, eyebrow: 'Foam',           blurb: 'Bordered silicone foam for moderate exudate. Atraumatic adhesive allows repositioning.' },
  { file: 'silicone-foam-6x6',     type: 'Silicone Foam',        size: '6" × 6"',       ref: 'MF-0606SFB', hcpcs: 'A6213', cat: 'WOUND_CARE', cents: 640, box: 10, rx: false, eyebrow: 'Foam',           blurb: 'Bordered silicone foam for moderate to heavy exudate on larger wounds.' },
  { file: 'sacral-foam',           type: 'Sacral Foam',          size: '9" × 9"',       ref: 'MF-0909SAC', hcpcs: 'A6214', cat: 'WOUND_CARE', cents: 720, box: 10, rx: false, eyebrow: 'Foam',           blurb: 'Sacral-shaped bordered silicone foam contoured for the sacrum and coccyx.' },
  { file: 'heel-foam',             type: 'Heel Foam',            size: '6" × 8"',       ref: 'MF-0608HEL', hcpcs: 'A6214', cat: 'WOUND_CARE', cents: 780, box: 10, rx: false, eyebrow: 'Foam',           blurb: 'Heel-shaped bordered silicone foam for offloading and pressure-injury prevention.' },

  // ── Super absorbent ─────────────────────────────────────────────────────
  { file: 'super-absorbent-4x4',   type: 'Super Absorbent',      size: '4" × 4"',       ref: 'MS-0404SAN', hcpcs: 'A6252', cat: 'WOUND_CARE', cents: 280, box: 10, rx: false, eyebrow: 'Absorbent pad',   blurb: 'Non-adherent super-absorbent pad for heavy exudate. Locks fluid away from the wound bed.' },
  { file: 'super-absorbent-8x8',   type: 'Super Absorbent',      size: '8" × 8"',       ref: 'MS-0808SAN', hcpcs: 'A6253', cat: 'WOUND_CARE', cents: 900, box: 10, rx: false, eyebrow: 'Absorbent pad',   blurb: 'Non-adherent super-absorbent pad for heavily exuding large wounds.' },

  // ── Contact layer ───────────────────────────────────────────────────────
  { file: 'contact-layer-3x4',     type: 'Silicone Contact Layer', size: '3" × 4"',     ref: 'ML-0304SCL', hcpcs: 'A6206', cat: 'WOUND_CARE', cents: 420, box: 10, rx: false, eyebrow: 'Contact layer',   blurb: 'Perforated silicone contact layer. Protects the wound bed and allows exudate to pass to a secondary dressing.' },
  { file: 'contact-layer-6x8',     type: 'Silicone Contact Layer', size: '6" × 8"',     ref: 'ML-0608SCL', hcpcs: 'A6207', cat: 'WOUND_CARE', cents: 760, box: 10, rx: false, eyebrow: 'Contact layer',   blurb: 'Perforated silicone contact layer for larger wounds and graft sites.' },

  // ── Hydrocolloid ────────────────────────────────────────────────────────
  { file: 'hydrocolloid-2x2',      type: 'Hydrocolloid',         size: '2" × 2"',       ref: 'MH-0202HCD', hcpcs: 'A6234', cat: 'WOUND_CARE', cents: 260, box: 10, rx: false, eyebrow: 'Hydrocolloid',    blurb: 'Occlusive hydrocolloid for light to moderate exudate. Supports autolytic debridement.' },
  { file: 'hydrocolloid-4x4',      type: 'Hydrocolloid',         size: '4" × 4"',       ref: 'MH-0404HCD', hcpcs: 'A6235', cat: 'WOUND_CARE', cents: 470, box: 10, rx: false, eyebrow: 'Hydrocolloid',    blurb: 'Occlusive hydrocolloid for light to moderate exudate. Supports autolytic debridement.' },

  // ── Transparent film ────────────────────────────────────────────────────
  { file: 'transparent-film-4x5',  type: 'Transparent Film',     size: '4" × 4.75"',    ref: 'MT-0405TFD', hcpcs: 'A6257', cat: 'WOUND_CARE', cents: 190, box: 10, rx: false, eyebrow: 'Film',            blurb: 'Waterproof transparent film for securement and low-exudate coverage.' },
  { file: 'transparent-film-6x8',  type: 'Transparent Film',     size: '6" × 8"',       ref: 'MT-0608TFD', hcpcs: 'A6258', cat: 'WOUND_CARE', cents: 380, box: 10, rx: false, eyebrow: 'Film',            blurb: 'Waterproof transparent film for larger securement and IV site coverage.' },

  // ── Gauze ───────────────────────────────────────────────────────────────
  { file: 'bordered-gauze-4x4',    type: 'Bordered Gauze',       size: '4" × 4"',       ref: 'MZ-0404BGZ', hcpcs: 'A6219', cat: 'WOUND_CARE', cents: 160, box: 25, rx: false, eyebrow: 'Gauze',           blurb: 'Bordered gauze island dressing for light exudate and post-op coverage.' },
  { file: 'bordered-gauze-6x6',    type: 'Bordered Gauze',       size: '6" × 6"',       ref: 'MZ-0606BGZ', hcpcs: 'A6220', cat: 'WOUND_CARE', cents: 320, box: 25, rx: false, eyebrow: 'Gauze',           blurb: 'Bordered gauze island dressing for larger post-op and donor sites.' },
];

export const handleFor = (p) => `merit-${p.file}`;
export const titleFor = (p) => `${p.type} · ${p.size}`;
