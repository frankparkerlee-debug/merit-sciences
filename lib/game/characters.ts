// ─────────────────────────────────────────────────────────────────────────
// Peptide Tycoon — character roster
//
// Every mascot is a parody hero mapped to a REAL Merit SKU. The `handle`
// deep-links into the live storefront (/products/<handle>) so the game is a
// funnel: collect a hero → buy the real compound. Leveling a hero unlocks
// escalating, product-specific discount codes (see REWARD_TIERS) — the core
// "play converts to purchase" loop.
//
// Balance: unlockCost rises ~3-4x per character; baseRate (RP/sec at level 1)
// rises in step so each new hero is a meaningful jump. Upgrade cost grows
// exponentially (store.ts) which soft-caps any single hero and pushes the
// player to keep collecting.
// ─────────────────────────────────────────────────────────────────────────

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type GameCharacter = {
  /** Stable id — also the localStorage key for owned-state. */
  id: string;
  /** Parody hero name shown in the game. */
  name: string;
  /** Real compound this hero represents. */
  compound: string;
  /** Real storefront handle — deep-links to /products/<handle>. */
  handle: string;
  emoji: string;
  rarity: Rarity;
  /** One-line flavor — the meme hook. */
  tagline: string;
  /** RP cost to recruit (unlock) the hero. */
  unlockCost: number;
  /** RP/sec produced at level 1. Scales linearly with level. */
  baseRate: number;
  /** Prefix for this hero's unlockable Merit discount codes, e.g. RETA → RETA10. */
  codePrefix: string;
};

/**
 * Discount reward ladder. When a hero's level reaches `level`, the player
 * unlocks a real promo code for that hero's compound at `pct`% off.
 *
 * NOTE: these codes are surfaced in-game as the reward UI. To make them
 * redeemable, mint matching codes in the checkout backend (Stripe coupons /
 * the storefront promo system) using the `${codePrefix}${pct}` convention,
 * e.g. RETA10. Until then they function as a marketing teaser + intent signal.
 */
export const REWARD_TIERS: { level: number; pct: number; label: string }[] = [
  { level: 5, pct: 5, label: 'Initiate' },
  { level: 15, pct: 10, label: 'Researcher' },
  { level: 30, pct: 15, label: 'Director' },
];

export function rewardCode(c: GameCharacter, pct: number): string {
  return `${c.codePrefix}${pct}`;
}

export const RARITY_META: Record<
  Rarity,
  { label: string; ring: string; chip: string; glow: string }
> = {
  common: {
    label: 'Common',
    ring: 'ring-border',
    chip: 'bg-border-soft text-ink-soft',
    glow: 'shadow-[0_2px_12px_rgba(11,15,25,0.06)]',
  },
  rare: {
    label: 'Rare',
    ring: 'ring-cobalt-soft',
    chip: 'bg-cobalt/10 text-cobalt',
    glow: 'shadow-[0_4px_20px_rgba(46,77,219,0.16)]',
  },
  epic: {
    label: 'Epic',
    ring: 'ring-[#8B5CF6]',
    chip: 'bg-[#8B5CF6]/12 text-[#7C3AED]',
    glow: 'shadow-[0_6px_26px_rgba(139,92,246,0.22)]',
  },
  legendary: {
    label: 'Legendary',
    ring: 'ring-star',
    chip: 'bg-star/15 text-[#B47A12]',
    glow: 'shadow-[0_8px_34px_rgba(240,176,64,0.30)]',
  },
};

// Ordered by power/cost — also the display order in the roster.
export const CHARACTERS: GameCharacter[] = [
  {
    id: 'coppertop',
    name: 'Coppertop',
    compound: 'GHK-Cu',
    handle: 'ghk-cu',
    emoji: '✨',
    rarity: 'common',
    tagline: 'Patches the squad up, one copper tripeptide at a time.',
    unlockCost: 25,
    baseRate: 1,
    codePrefix: 'GHK',
  },
  {
    id: 'sir-morelin',
    name: 'Sir Morelin',
    compound: 'Sermorelin Acetate',
    handle: 'sermorelin',
    emoji: '🛡️',
    rarity: 'common',
    tagline: 'A loyal knight of the GH axis. Sworn to the gains.',
    unlockCost: 130,
    baseRate: 4,
    codePrefix: 'SERM',
  },
  {
    id: 'brainiac-semax',
    name: 'Brainiac Semax',
    compound: 'Semax',
    handle: 'semax',
    emoji: '🧠',
    rarity: 'common',
    tagline: 'Big brain, bigger focus beam. Never misses a cue.',
    unlockCost: 650,
    baseRate: 15,
    codePrefix: 'SEMA',
  },
  {
    id: 'chill-bill',
    name: 'Chill Bill',
    compound: 'Selank',
    handle: 'selank',
    emoji: '😌',
    rarity: 'common',
    tagline: "Defuses every boss's rage meter before it fills.",
    unlockCost: 3_200,
    baseRate: 58,
    codePrefix: 'SLNK',
  },
  {
    id: 'tan-solo',
    name: 'Tan Solo',
    compound: 'Melanotan II',
    handle: 'melanotan-ii',
    emoji: '🌞',
    rarity: 'rare',
    tagline: 'Shoots first, tans later. Never tells you the odds.',
    unlockCost: 13_000,
    baseRate: 210,
    codePrefix: 'TAN',
  },
  {
    id: 'cupid-141',
    name: 'Cupid-141',
    compound: 'PT-141',
    handle: 'pt-141',
    emoji: '💘',
    rarity: 'rare',
    tagline: 'Charm stat: maxed. Resistance: futile.',
    unlockCost: 48_000,
    baseRate: 680,
    codePrefix: 'PT',
  },
  {
    id: 'mighty-mots',
    name: 'Mighty MOTS',
    compound: 'MOTS-c',
    handle: 'mots-c',
    emoji: '🐭',
    rarity: 'rare',
    tagline: 'Tiny mouse, mitochondrial muscle. Here to save the day.',
    unlockCost: 160_000,
    baseRate: 2_000,
    codePrefix: 'MOTS',
  },
  {
    id: 'captain-immuno',
    name: 'Captain Immuno',
    compound: 'Thymosin Alpha-1',
    handle: 'thymosin-alpha-1',
    emoji: '🛡️',
    rarity: 'rare',
    tagline: 'Blocks every debuff the lab throws at the squad.',
    unlockCost: 520_000,
    baseRate: 5_600,
    codePrefix: 'THY',
  },
  {
    id: 'aodroid',
    name: 'A.O.Droid',
    compound: 'AOD-9604',
    handle: 'aod-9604',
    emoji: '🤖',
    rarity: 'epic',
    tagline: 'Targets fat. Only fat. Will not stop. Cannot be reasoned with.',
    unlockCost: 1_800_000,
    baseRate: 18_000,
    codePrefix: 'AOD',
  },
  {
    id: 'wolverine',
    name: 'Wolverine',
    compound: 'BPC-157 + TB-500',
    handle: 'bpc-157-tb-500',
    emoji: '🐾',
    rarity: 'epic',
    tagline: 'Healing factor online. Revives downed teammates instantly.',
    unlockCost: 6_000_000,
    baseRate: 55_000,
    codePrefix: 'WOLV',
  },
  {
    id: 'iggy-hulk',
    name: 'Iggy Hulk',
    compound: 'IGF-1 LR3',
    handle: 'igf-1-lr3',
    emoji: '💚',
    rarity: 'epic',
    tagline: 'Anabolic SMASH. The more gains, the stronger he gets.',
    unlockCost: 20_000_000,
    baseRate: 170_000,
    codePrefix: 'IGF',
  },
  {
    id: 'nadzilla',
    name: 'NADzilla',
    compound: 'NAD+',
    handle: 'nad-500mg',
    emoji: '🔋',
    rarity: 'epic',
    tagline: 'Recharges the entire roster with one mitochondrial roar.',
    unlockCost: 65_000_000,
    baseRate: 520_000,
    codePrefix: 'NAD',
  },
  {
    id: 'father-time',
    name: 'Father Time',
    compound: 'Epitalon',
    handle: 'epitalon',
    emoji: '⏳',
    rarity: 'epic',
    tagline: 'Rewinds the clock on the whole team. Aging is optional.',
    unlockCost: 200_000_000,
    baseRate: 1_600_000,
    codePrefix: 'EPI',
  },
  {
    id: 'tesla-maul',
    name: 'Tesla Maul',
    compound: 'Tesamorelin',
    handle: 'th9507',
    emoji: '⚡',
    rarity: 'legendary',
    tagline: 'Melts the belly-fat boss in a single thunderous swing.',
    unlockCost: 700_000_000,
    baseRate: 5_500_000,
    codePrefix: 'TESA',
  },
  {
    id: 'tirzilla',
    name: 'Tirzilla',
    compound: 'Tirzepatide',
    handle: 'ly3298176',
    emoji: '🦖',
    rarity: 'legendary',
    tagline: 'Dual-pathway titan. Stomps cravings flat. Fears nothing.',
    unlockCost: 2_500_000_000,
    baseRate: 19_000_000,
    codePrefix: 'TIRZ',
  },
  {
    id: 'retatouille',
    name: 'Retatouille',
    compound: 'Retatrutide',
    handle: 'ly3437943',
    emoji: '🐀',
    rarity: 'legendary',
    tagline: 'The shredded rat king. Triple-threat final boss of the lab.',
    unlockCost: 9_000_000_000,
    baseRate: 65_000_000,
    codePrefix: 'RETA',
  },
];

export const CHARACTERS_BY_ID: Record<string, GameCharacter> = Object.fromEntries(
  CHARACTERS.map((c) => [c.id, c]),
);
