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
  { file: 'collagen-matrix-2x2',   type: 'Collagen Matrix',      size: '2" × 2"',       ref: 'MC-0202CS', hcpcs: 'A6021', cat: 'COLLAGEN',   piece: 1200, box: 10, rx: true,  eyebrow: 'Native collagen', blurb: 'Native collagen matrix for small and digit wounds.' },
  { file: 'collagen-matrix-4x4',   type: 'Collagen Matrix',      size: '4" × 4"',       ref: 'MC-0404CS', hcpcs: 'A6022', cat: 'COLLAGEN',   piece: 3800, box: 10, rx: true,  eyebrow: 'Native collagen', blurb: 'Native collagen matrix for moderate wound geometry.' },
  { file: 'collagen-matrix-7x7',   type: 'Collagen Matrix',      size: '7" × 7"',       ref: 'MC-0707CS', hcpcs: 'A6023', cat: 'COLLAGEN',   piece: 9000, box: 10, rx: true,  eyebrow: 'Native collagen', blurb: 'Native collagen matrix for large wounds. At 49 sq in it codes to A6023.' },
  { file: 'collagen-particulate',  type: 'Collagen Particulate', size: '1 g',           ref: 'MC-PARTCP', hcpcs: 'A6010', cat: 'COLLAGEN',   piece: 1650, box: 10, rx: true,  eyebrow: 'Particulate',     blurb: 'Particulate collagen for tunneling, undermined, or irregular wound geometry.' },

  // ── Alginate ────────────────────────────────────────────────────────────
  { file: 'calcium-alginate-2x2',  type: 'Calcium Alginate',     size: '2" × 2"',       ref: 'MA-0202CA', hcpcs: 'A6196', cat: 'WOUND_CARE', piece: 250, box: 10, rx: false, eyebrow: 'Alginate',        blurb: 'Highly absorbent calcium alginate for moderate to heavy exudate. Gels on contact.' },
  { file: 'calcium-alginate-4x4',  type: 'Calcium Alginate',     size: '4.33" × 4.33"', ref: 'MA-0433CA', hcpcs: 'A6197', cat: 'WOUND_CARE', piece: 400, box: 10, rx: false, eyebrow: 'Alginate',        blurb: 'Highly absorbent calcium alginate for moderate to heavy exudate. Gels on contact.' },
  { file: 'calcium-alginate-6x6',  type: 'Calcium Alginate',     size: '6" × 6"',       ref: 'MA-0606CA', hcpcs: 'A6198', cat: 'WOUND_CARE', piece: 575, box: 10, rx: false, eyebrow: 'Alginate',        blurb: 'Highly absorbent calcium alginate for large, heavily exuding wounds.' },
  { file: 'alginate-rope',         type: 'Alginate Rope',        size: '2 g',           ref: 'MA-ROPECA', hcpcs: 'A6199', cat: 'WOUND_CARE', piece: 500, box: 10, rx: false, eyebrow: 'Alginate',        blurb: 'Alginate rope for packing tunneling and undermined wounds.' },
  { file: 'silver-alginate-2x2',   type: 'Silver Alginate',      size: '2" × 2"',       ref: 'MA-0202SA', hcpcs: 'A6196', cat: 'WOUND_CARE', piece: 275, box: 10, rx: false, eyebrow: 'Antimicrobial',   blurb: 'Calcium alginate with ionic silver where antimicrobial action is indicated.' },
  { file: 'silver-alginate-4x4',   type: 'Silver Alginate',      size: '4.33" × 4.33"', ref: 'MA-0433SA', hcpcs: 'A6197', cat: 'WOUND_CARE', piece: 475, box: 10, rx: false, eyebrow: 'Antimicrobial',   blurb: 'Calcium alginate with ionic silver where antimicrobial action is indicated.' },
  { file: 'silver-alginate-rope',  type: 'Silver Alginate Rope', size: '2 g',           ref: 'MA-ROPESA', hcpcs: 'A6199', cat: 'WOUND_CARE', piece: 680, box: 10, rx: false, eyebrow: 'Antimicrobial',   blurb: 'Silver alginate rope for packing infected or at-risk cavity wounds.' },
  { file: 'phmb-alginate-4x4',     type: 'PHMB Alginate',        size: '4.33" × 4.33"', ref: 'MA-0433PA', hcpcs: 'A6197', cat: 'WOUND_CARE', piece: 540, box: 10, rx: false, eyebrow: 'Antimicrobial',   blurb: 'Calcium alginate with PHMB as a silver-free antimicrobial option.' },

  // ── Gelling fibre ───────────────────────────────────────────────────────
  { file: 'gelling-fiber-2x2',     type: 'Gelling Fiber',        size: '2" × 2"',       ref: 'MG-0202GF', hcpcs: 'A6196', cat: 'WOUND_CARE', piece: 340, box: 10, rx: false, eyebrow: 'Gelling fiber',   blurb: 'Carboxymethylcellulose gelling fiber. Locks exudate into the gel to protect periwound skin.' },
  { file: 'gelling-fiber-4x4',     type: 'Gelling Fiber',        size: '4" × 4"',       ref: 'MG-0404GF', hcpcs: 'A6197', cat: 'WOUND_CARE', piece: 590, box: 10, rx: false, eyebrow: 'Gelling fiber',   blurb: 'Carboxymethylcellulose gelling fiber. Locks exudate into the gel to protect periwound skin.' },

  // ── Foam ────────────────────────────────────────────────────────────────
  { file: 'silicone-foam-2x2',     type: 'Silicone Foam',        size: '2" × 2"',       ref: 'MF-0202SFB', hcpcs: 'A6212', cat: 'WOUND_CARE', piece: 300, box: 10, rx: false, eyebrow: 'Foam',           blurb: 'Bordered silicone foam for moderate exudate. Atraumatic adhesive allows repositioning.' },
  { file: 'silicone-foam-4x4',     type: 'Silicone Foam',        size: '4" × 4"',       ref: 'MF-0404SFB', hcpcs: 'A6213', cat: 'WOUND_CARE', piece: 450, box: 10, rx: false, eyebrow: 'Foam',           blurb: 'Bordered silicone foam for moderate exudate. Atraumatic adhesive allows repositioning.' },
  { file: 'silicone-foam-6x6',     type: 'Silicone Foam',        size: '6" × 6"',       ref: 'MF-0606SFB', hcpcs: 'A6213', cat: 'WOUND_CARE', piece: 640, box: 10, rx: false, eyebrow: 'Foam',           blurb: 'Bordered silicone foam for moderate to heavy exudate on larger wounds.' },
  { file: 'sacral-foam',           type: 'Sacral Foam',          size: '9" × 9"',       ref: 'MF-0909SAC', hcpcs: 'A6214', cat: 'WOUND_CARE', piece: 650, box: 10, rx: false, eyebrow: 'Foam',           blurb: 'Sacral-shaped bordered silicone foam contoured for the sacrum and coccyx.' },
  { file: 'heel-foam',             type: 'Heel Foam',            size: '6" × 8"',       ref: 'MF-0608HEL', hcpcs: 'A6214', cat: 'WOUND_CARE', piece: 780, box: 10, rx: false, eyebrow: 'Foam',           blurb: 'Heel-shaped bordered silicone foam for offloading and pressure-injury prevention.' },

  // ── Super absorbent ─────────────────────────────────────────────────────
  { file: 'super-absorbent-4x4',   type: 'Super Absorbent',      size: '4" × 4"',       ref: 'MS-0404SAN', hcpcs: 'A6252', cat: 'WOUND_CARE', piece: 280, box: 10, rx: false, eyebrow: 'Absorbent pad',   blurb: 'Non-adherent super-absorbent pad for heavy exudate. Locks fluid away from the wound bed.' },
  { file: 'super-absorbent-8x8',   type: 'Super Absorbent',      size: '8" × 8"',       ref: 'MS-0808SAN', hcpcs: 'A6253', cat: 'WOUND_CARE', piece: 900, box: 10, rx: false, eyebrow: 'Absorbent pad',   blurb: 'Non-adherent super-absorbent pad for heavily exuding large wounds.' },

  // ── Contact layer ───────────────────────────────────────────────────────
  { file: 'contact-layer-3x4',     type: 'Silicone Contact Layer', size: '3" × 4"',     ref: 'ML-0304SCL', hcpcs: 'A6206', cat: 'WOUND_CARE', piece: 420, box: 10, rx: false, eyebrow: 'Contact layer',   blurb: 'Perforated silicone contact layer. Protects the wound bed and allows exudate to pass to a secondary dressing.' },
  { file: 'contact-layer-6x8',     type: 'Silicone Contact Layer', size: '6" × 8"',     ref: 'ML-0608SCL', hcpcs: 'A6207', cat: 'WOUND_CARE', piece: 760, box: 10, rx: false, eyebrow: 'Contact layer',   blurb: 'Perforated silicone contact layer for larger wounds and graft sites.' },

  // ── Hydrocolloid ────────────────────────────────────────────────────────
  { file: 'hydrocolloid-2x2',      type: 'Hydrocolloid',         size: '2" × 2"',       ref: 'MH-0202HCD', hcpcs: 'A6234', cat: 'WOUND_CARE', piece: 260, box: 10, rx: false, eyebrow: 'Hydrocolloid',    blurb: 'Occlusive hydrocolloid for light to moderate exudate. Supports autolytic debridement.' },
  { file: 'hydrocolloid-4x4',      type: 'Hydrocolloid',         size: '4" × 4"',       ref: 'MH-0404HCD', hcpcs: 'A6235', cat: 'WOUND_CARE', piece: 470, box: 10, rx: false, eyebrow: 'Hydrocolloid',    blurb: 'Occlusive hydrocolloid for light to moderate exudate. Supports autolytic debridement.' },

  // ── Transparent film ────────────────────────────────────────────────────
  { file: 'transparent-film-4x5',  type: 'Transparent Film',     size: '4" × 4.75"',    ref: 'MT-0405TFD', hcpcs: 'A6257', cat: 'WOUND_CARE', piece: 190, box: 10, rx: false, eyebrow: 'Film',            blurb: 'Waterproof transparent film for securement and low-exudate coverage.' },
  { file: 'transparent-film-6x8',  type: 'Transparent Film',     size: '6" × 8"',       ref: 'MT-0608TFD', hcpcs: 'A6258', cat: 'WOUND_CARE', piece: 380, box: 10, rx: false, eyebrow: 'Film',            blurb: 'Waterproof transparent film for larger securement and IV site coverage.' },

  // ── Gauze ───────────────────────────────────────────────────────────────
  { file: 'bordered-gauze-4x4',    type: 'Bordered Gauze',       size: '4" × 4"',       ref: 'MZ-0404BGZ', hcpcs: 'A6219', cat: 'WOUND_CARE', piece: 60, box: 25, rx: false, eyebrow: 'Gauze',           blurb: 'Bordered gauze island dressing for light exudate and post-op coverage.' },
  { file: 'bordered-gauze-6x6',    type: 'Bordered Gauze',       size: '6" × 6"',       ref: 'MZ-0606BGZ', hcpcs: 'A6220', cat: 'WOUND_CARE', piece: 123, box: 25, rx: false, eyebrow: 'Gauze',           blurb: 'Bordered gauze island dressing for larger post-op and donor sites.' },
  // ââ Gels ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // Family letter Y. Sold by tube/bottle, so `box` is the case count.
  { file: 'hydrogel-3oz',          type: 'Amorphous Hydrogel',   size: '3 oz tube',     ref: 'MY-03OZHG', hcpcs: 'A6248', cat: 'WOUND_CARE', piece: 620, box: 12, rx: false, form: 'tube', eyebrow: 'Hydrogel', blurb: 'Amorphous hydrogel to donate moisture to dry wound beds and support autolytic debridement.' },
  { file: 'silver-hydrogel-3oz',   type: 'Silver Hydrogel',      size: '3 oz tube',     ref: 'MY-03OZSH', hcpcs: 'A6248', cat: 'WOUND_CARE', piece: 980, box: 12, rx: false, form: 'tube', eyebrow: 'Hydrogel', blurb: 'Amorphous hydrogel with ionic silver for dry or minimally exuding wounds at risk of infection.' },
  { file: 'hydrogel-sheet-4x4',    type: 'Hydrogel Sheet',       size: '4" × 4"',      ref: 'MY-0404HS', hcpcs: 'A6242', cat: 'WOUND_CARE', piece: 480, box: 10, rx: false, eyebrow: 'Hydrogel', blurb: 'Hydrogel sheet for dry to lightly exuding wounds. Cooling on application.' },
  { file: 'hydrogel-gauze-4x4',    type: 'Hydrogel Gauze',       size: '4" × 4"',      ref: 'MY-0404HG', hcpcs: 'A6231', cat: 'WOUND_CARE', piece: 360, box: 10, rx: false, eyebrow: 'Hydrogel', blurb: 'Hydrogel-impregnated gauze for packing dry cavity and tunneling wounds.' },
  { file: 'collagen-gel-1oz',      type: 'Collagen Gel',         size: '1 oz tube',     ref: 'MC-01OZCG', hcpcs: 'A6011', cat: 'COLLAGEN',   piece: 2400, box: 12, rx: true, form: 'tube', eyebrow: 'Native collagen', blurb: 'Collagen in gel form for wounds where a sheet or particulate will not conform.' },

  // ââ Cleansers & skin care âââââââââââââââââââââââââââââââââââââââââââââââ
  { file: 'wound-cleanser-8oz',    type: 'Wound Cleanser',       size: '8 oz spray',    ref: 'MW-08OZWC', hcpcs: 'A6260', cat: 'WOUND_CARE', piece: 420, box: 12, rx: false, form: 'bottle', eyebrow: 'Cleanser', blurb: 'Non-cytotoxic wound cleanser spray for routine irrigation and debris removal.' },
  { file: 'saline-wash-7oz',       type: 'Sterile Saline Wash',  size: '7.1 oz',        ref: 'MW-07OZSW', hcpcs: 'A6260', cat: 'WOUND_CARE', piece: 340, box: 12, rx: false, form: 'bottle', eyebrow: 'Cleanser', blurb: 'Pressurised sterile saline for wound irrigation without additives.' },
  { file: 'barrier-film-wipes',    type: 'Skin Barrier Film',    size: 'Wipes, 30 ct',  ref: 'MW-30CTBF', hcpcs: 'A6250', cat: 'WOUND_CARE', piece: 580, box: 10, rx: false, form: 'box', sterile: false, eyebrow: 'Skin care', blurb: 'No-sting barrier film wipes to protect periwound skin from adhesive trauma and moisture.' },
  { file: 'barrier-cream-4oz',     type: 'Moisture Barrier Cream', size: '4 oz tube',   ref: 'MW-04OZBC', hcpcs: 'A6250', cat: 'WOUND_CARE', piece: 460, box: 12, rx: false, form: 'tube', sterile: false, eyebrow: 'Skin care', blurb: 'Zinc-based moisture barrier for incontinence-associated dermatitis and periwound protection.' },

  // ââ Gauze, packing & secondary ââââââââââââââââââââââââââââââââââââââââââ
  { file: 'gauze-sponge-4x4',      type: 'Gauze Sponge',         size: '4" × 4"',      ref: 'MZ-0404GSP', hcpcs: 'A6216', cat: 'WOUND_CARE', piece: 30, box: 50, rx: false, eyebrow: 'Gauze', blurb: 'Sterile gauze sponge for cleansing, packing, and secondary coverage.' },
  { file: 'petrolatum-gauze-3x8',  type: 'Petrolatum Gauze',     size: '3" × 8"',      ref: 'MZ-0308PGZ', hcpcs: 'A6222', cat: 'WOUND_CARE', piece: 280, box: 12, rx: false, eyebrow: 'Impregnated', blurb: 'Petrolatum-impregnated gauze for non-adherent coverage of donor and graft sites.' },
  { file: 'iodoform-packing',      type: 'Iodoform Packing Strip', size: '1/4" × 5 yd', ref: 'MZ-0025IP', hcpcs: 'A6222', cat: 'WOUND_CARE', piece: 340, box: 12, rx: false, form: 'roll', eyebrow: 'Impregnated', blurb: 'Iodoform-impregnated packing strip for draining sinus tracts and abscess cavities.' },
  { file: 'composite-4x4',         type: 'Composite Dressing',   size: '4" × 4"',      ref: 'MZ-0404CMP', hcpcs: 'A6203', cat: 'WOUND_CARE', piece: 240, box: 10, rx: false, eyebrow: 'Composite', blurb: 'All-in-one composite dressing: absorbent pad, contact layer, and adhesive border.' },
  { file: 'abdominal-pad-8x10',    type: 'Abdominal Pad',        size: '8" × 10"',     ref: 'MZ-0810ABD', hcpcs: 'A6254', cat: 'WOUND_CARE', piece: 200, box: 25, rx: false, eyebrow: 'Secondary', blurb: 'High-capacity abdominal pad for heavily draining wounds as a secondary dressing.' },

  // ââ Compression, securement & padding âââââââââââââââââââââââââââââââââââ
  // Family letter N. Non-sterile by nature.
  { file: 'elastic-bandage-4in',   type: 'Elastic Bandage',      size: '4" × 5 yd',    ref: 'MN-04INEB', hcpcs: 'A6448', cat: 'WOUND_CARE', piece: 180, box: 10, rx: false, form: 'roll', sterile: false, eyebrow: 'Compression', blurb: 'Light-compression elastic bandage for securement and oedema management.' },
  { file: 'cohesive-wrap-4in',     type: 'Cohesive Wrap',        size: '4" × 5 yd',    ref: 'MN-04INCW', hcpcs: 'A6454', cat: 'WOUND_CARE', piece: 220, box: 12, rx: false, form: 'roll', sterile: false, eyebrow: 'Compression', blurb: 'Self-adherent cohesive wrap that sticks to itself, not to skin or hair.' },
  { file: 'undercast-padding-4in', type: 'Undercast Padding',    size: '4" × 4 yd',    ref: 'MN-04INUP', hcpcs: 'A6441', cat: 'WOUND_CARE', piece: 160, box: 12, rx: false, form: 'roll', sterile: false, eyebrow: 'Padding', blurb: 'Cotton undercast padding for pressure distribution beneath compression.' },
  { file: 'paper-tape-2in',        type: 'Paper Tape',           size: '2" × 10 yd',   ref: 'MN-02INPT', hcpcs: 'A4452', cat: 'WOUND_CARE', piece: 140, box: 12, rx: false, form: 'roll', sterile: false, eyebrow: 'Securement', blurb: 'Hypoallergenic paper tape for fragile skin and frequent dressing changes.' },
  { file: 'silicone-tape-2in',     type: 'Silicone Tape',        size: '2" × 5 yd',    ref: 'MN-02INST', hcpcs: 'A4450', cat: 'WOUND_CARE', piece: 320, box: 12, rx: false, form: 'roll', sterile: false, eyebrow: 'Securement', blurb: 'Atraumatic silicone tape for at-risk and repeatedly taped skin.' },

  // ââ NPWT ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  { file: 'npwt-dressing-kit',     type: 'NPWT Dressing Kit',    size: 'Medium',        ref: 'MP-MEDKIT', hcpcs: 'A6550', cat: 'DME', piece: 2900, box: 5, rx: true, form: 'box', eyebrow: 'NPWT', blurb: 'Negative-pressure wound therapy dressing kit — foam, drape, and pad.' },
  { file: 'npwt-canister-250',     type: 'NPWT Canister',        size: '250 mL',        ref: 'MP-250CAN', hcpcs: 'A7000', cat: 'DME', piece: 1450, box: 5, rx: true, form: 'bottle', eyebrow: 'NPWT', blurb: 'Negative-pressure wound therapy collection canister with gel solidifier.' },

];

/**
 * Box price, DERIVED. `piece` is the price of one dressing/tube/roll; `box` is
 * how many are in a box. Storing the per-piece figure and multiplying is the
 * whole point: the catalog was briefly seeded with per-piece values in the box
 * field, which priced a dressing that reimburses $141–314 at nine dollars.
 * Keeping the unit explicit in the source makes that mistake impossible to
 * repeat silently.
 */
export const boxCents = (p) => p.piece * p.box;

export const handleFor = (p) => `merit-${p.file}`;
export const titleFor = (p) => `${p.type} · ${p.size}`;
