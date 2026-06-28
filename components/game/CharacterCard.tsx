'use client';

import Link from 'next/link';
import {
  RARITY_META,
  REWARD_TIERS,
  type GameCharacter,
} from '@/lib/game/characters';
import { formatRP, formatRate } from '@/lib/game/format';

type Props = {
  char: GameCharacter;
  level: number;
  rp: number;
  recruitCost: number;
  upgradeCost: number;
  onRecruit: () => void;
  onUpgrade: () => void;
};

export function CharacterCard({
  char,
  level,
  rp,
  recruitCost,
  upgradeCost,
  onRecruit,
  onUpgrade,
}: Props) {
  const owned = level > 0;
  const rarity = RARITY_META[char.rarity];
  const canRecruit = rp >= recruitCost;
  const canUpgrade = rp >= upgradeCost;

  // Next discount tier this hero is climbing toward.
  const nextTier = REWARD_TIERS.find((t) => level < t.level);
  const activeTier = [...REWARD_TIERS].reverse().find((t) => level >= t.level);

  return (
    <div
      className={`relative flex flex-col rounded-2xl bg-white ring-1 ${rarity.ring} ${
        owned ? rarity.glow : ''
      } p-4 transition`}
    >
      {/* Rarity + level row */}
      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full ${rarity.chip}`}
        >
          {rarity.label}
        </span>
        {owned && (
          <span className="font-mono text-[11px] font-semibold text-ink-soft">
            Lv {level}
          </span>
        )}
      </div>

      {/* Avatar */}
      <div className="mt-3 flex items-center gap-3">
        <div
          className={`grid place-items-center h-14 w-14 shrink-0 rounded-xl text-3xl ${
            owned ? 'bg-cream' : 'bg-border-soft grayscale opacity-50'
          }`}
        >
          {char.emoji}
        </div>
        <div className="min-w-0">
          <h3 className="font-display font-bold text-ink leading-tight truncate">
            {char.name}
          </h3>
          <p className="text-[11px] text-ink-muted truncate">{char.compound}</p>
        </div>
      </div>

      <p className="mt-2.5 text-[12px] leading-snug text-ink-soft min-h-[2.4em]">
        {char.tagline}
      </p>

      {/* Production */}
      <div className="mt-2 flex items-center justify-between text-[12px]">
        <span className="text-ink-muted">Output</span>
        <span className="font-mono font-semibold text-cobalt">
          {owned ? formatRate(char.baseRate * level) : formatRate(char.baseRate)}
        </span>
      </div>

      {/* Discount reward status */}
      <div className="mt-2 rounded-lg bg-cream/70 px-2.5 py-1.5 text-[11px]">
        {activeTier ? (
          <span className="font-semibold text-success">
            🎟️ {activeTier.pct}% off {char.compound} unlocked
          </span>
        ) : nextTier ? (
          <span className="text-ink-soft">
            🎟️ Reach <span className="font-semibold">Lv {nextTier.level}</span> →{' '}
            {nextTier.pct}% off {char.compound}
          </span>
        ) : (
          <span className="text-ink-soft">Max rewards unlocked 🏆</span>
        )}
      </div>

      {/* Action */}
      <div className="mt-3">
        {!owned ? (
          <button
            onClick={onRecruit}
            disabled={!canRecruit}
            className="w-full rounded-xl bg-cobalt text-white text-sm font-semibold py-2.5 disabled:bg-border disabled:text-ink-muted transition hover:bg-cobalt/90"
          >
            Recruit · {formatRP(recruitCost)} RP
          </button>
        ) : (
          <button
            onClick={onUpgrade}
            disabled={!canUpgrade}
            className="w-full rounded-xl bg-ink text-white text-sm font-semibold py-2.5 disabled:bg-border disabled:text-ink-muted transition hover:bg-steel"
          >
            Upgrade · {formatRP(upgradeCost)} RP
          </button>
        )}
      </div>

      {/* Funnel link — buy the real compound */}
      <Link
        href={`/products/${char.handle}`}
        className="mt-2 text-center text-[11px] font-semibold text-cobalt hover:underline"
      >
        Shop the real {char.compound} →
      </Link>
    </div>
  );
}
