'use client';

import { memo } from 'react';
import Link from 'next/link';
import {
  RARITY_META,
  REWARD_TIERS,
  type GameCharacter,
} from '@/lib/game/characters';
import { formatRP, formatRate } from '@/lib/game/format';
import { PixelSprite } from './PixelSprite';

type Props = {
  char: GameCharacter;
  level: number;
  /** Live affordability — computed by the parent so this card can be memoized. */
  canRecruit: boolean;
  canUpgrade: boolean;
  recruitCost: number;
  /** Total RP cost for the currently-selected buy amount. */
  upgradeCost: number;
  /** How many levels the current buy amount will purchase. */
  upgradeLevels: number;
  /** Stable store actions — passed down so memo isn't busted by new closures. */
  onRecruit: (id: string) => void;
  onUpgrade: (id: string, count: number) => void;
};

// Per-rarity gradient backdrop for the avatar medallion.
const MEDALLION: Record<string, string> = {
  common: 'from-[#EEF0F3] to-[#DDE2EA]',
  rare: 'from-[#DCE6FF] to-[#A9C2FF]',
  epic: 'from-[#E9DCFF] to-[#C6A9FF]',
  legendary: 'from-[#FFF0CE] to-[#FFD98A]',
};

function CharacterCardImpl({
  char,
  level,
  canRecruit,
  canUpgrade,
  recruitCost,
  upgradeCost,
  upgradeLevels,
  onRecruit,
  onUpgrade,
}: Props) {
  const owned = level > 0;
  const rarity = RARITY_META[char.rarity];
  const isLegendary = char.rarity === 'legendary';

  // Discount-tier progress: how far to the next reward unlock.
  const nextTier = REWARD_TIERS.find((t) => level < t.level);
  const activeTier = [...REWARD_TIERS].reverse().find((t) => level >= t.level);
  const prevLevel = activeTier?.level ?? 0;
  const tierProgress = nextTier
    ? Math.min(1, (level - prevLevel) / (nextTier.level - prevLevel))
    : 1;

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ${
        rarity.ring
      } ${owned ? rarity.glow : 'opacity-95'} transition-transform duration-150 hover:-translate-y-0.5`}
    >
      {/* Holographic sheen — legendaries only, and only once owned. */}
      {isLegendary && owned && (
        <div className="holo-foil pointer-events-none absolute inset-0 z-0 opacity-40" />
      )}

      {/* Rarity ribbon */}
      <div
        className={`relative z-10 flex items-center justify-between px-4 pt-3 ${
          owned ? '' : 'grayscale'
        }`}
      >
        <span
          className={`font-pixel text-[7px] uppercase px-2 py-1 rounded ${rarity.chip}`}
        >
          {rarity.label}
        </span>
        {owned ? (
          <span className="font-mono text-[11px] font-bold text-ink">
            LV {level}
          </span>
        ) : (
          <span className="text-[11px]">🔒</span>
        )}
      </div>

      <div className="relative z-10 flex items-center gap-3 px-4 mt-2.5">
        <div
          className={`relative grid place-items-center h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br ${
            MEDALLION[char.rarity]
          } p-1.5 shadow-inner ${owned ? '' : 'grayscale opacity-60'}`}
        >
          <PixelSprite emoji={char.emoji} />
        </div>
        <div className="min-w-0">
          <h3 className="font-display font-extrabold text-ink leading-tight truncate">
            {char.name}
          </h3>
          <p className="text-[11px] font-medium text-ink-muted truncate">
            {char.compound}
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-cobalt/8 px-2 py-0.5 text-[10px] font-bold text-cobalt font-mono">
            {formatRate(owned ? char.baseRate * level : char.baseRate)}
          </p>
        </div>
      </div>

      <p className="relative z-10 px-4 mt-2.5 text-[11.5px] leading-snug text-ink-soft min-h-[2.6em]">
        “{char.tagline}”
      </p>

      {/* Discount reward tracker */}
      <div className="relative z-10 px-4 mt-2">
        <div className="rounded-xl bg-cream/80 px-2.5 py-2">
          <div className="flex items-center justify-between text-[10.5px]">
            {activeTier ? (
              <span className="font-bold text-success">
                🎟️ {activeTier.pct}% off unlocked
              </span>
            ) : (
              <span className="font-semibold text-ink-soft">🎟️ Discount track</span>
            )}
            {nextTier && (
              <span className="font-mono text-ink-muted">
                Lv {nextTier.level} → {nextTier.pct}%
              </span>
            )}
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-white overflow-hidden ring-1 ring-border-soft">
            <div
              className="h-full rounded-full bg-success transition-all duration-300"
              style={{ width: `${tierProgress * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="relative z-10 px-4 mt-3 mb-1">
        {!owned ? (
          <button
            onClick={() => onRecruit(char.id)}
            disabled={!canRecruit}
            className="w-full rounded-xl bg-cobalt text-white text-sm font-bold py-2.5 touch-manipulation disabled:bg-border disabled:text-ink-muted transition hover:bg-cobalt/90 active:scale-[0.98]"
          >
            {canRecruit ? 'Recruit' : 'Recruit'} · {formatRP(recruitCost)}
          </button>
        ) : (
          <button
            onClick={() => onUpgrade(char.id, upgradeLevels)}
            disabled={!canUpgrade}
            className="w-full rounded-xl bg-ink text-white text-sm font-bold py-2.5 touch-manipulation disabled:bg-border disabled:text-ink-muted transition hover:bg-steel active:scale-[0.98]"
          >
            Upgrade{upgradeLevels > 1 ? ` ×${upgradeLevels}` : ''} ·{' '}
            {formatRP(upgradeCost)}
          </button>
        )}
      </div>

      <Link
        href={`/products/${char.handle}`}
        className="relative z-10 px-4 pb-3 pt-0.5 text-center text-[10.5px] font-bold text-cobalt hover:underline"
      >
        Shop the real {char.compound} →
      </Link>
    </div>
  );
}

// Memoized: with stable handlers + primitive props, a card only re-renders
// when ITS own affordability/level changes — not on every 10Hz idle tick.
export const CharacterCard = memo(CharacterCardImpl);
