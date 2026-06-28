'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CHARACTERS,
  CHARACTERS_BY_ID,
  REWARD_TIERS,
  rewardCode,
  type GameCharacter,
} from './characters';

// ── Tunable economy constants ──────────────────────────────────────────────
/** Each upgrade level multiplies the *next* upgrade cost by this. */
const UPGRADE_GROWTH = 1.18;
/** Manual click yields base + this fraction of your current RP/sec. */
const CLICK_RATE_FRACTION = 0.08;
const CLICK_BASE = 1;
/** Offline earnings cap so the game can't be left running for free forever. */
const OFFLINE_CAP_SECONDS = 8 * 3600;
/** Offline accrues at a discount vs. active play (idle-game convention). */
const OFFLINE_EFFICIENCY = 0.5;
/** Each Merit Token from prestige adds this to the global production multiplier. */
const TOKEN_BOOST = 0.02;
/** Prestige unlocks once you've earned this much, lifetime. */
export const PRESTIGE_THRESHOLD = 1_000_000;

export type UnlockedReward = {
  characterId: string;
  compound: string;
  handle: string;
  pct: number;
  code: string;
  tierLabel: string;
};

type GameState = {
  /** Spendable Research Points. */
  rp: number;
  /** Lifetime RP earned — drives prestige + the share card. */
  totalEarned: number;
  /** characterId → level (1+). Absent = not yet recruited. */
  owned: Record<string, number>;
  /** Epoch ms of last activity — powers offline earnings. */
  lastSeen: number;
  /** Prestige currency. */
  meritTokens: number;
  prestigeCount: number;

  // ── derived ──
  ratePerSec: () => number;
  clickPower: () => number;
  productionMultiplier: () => number;
  collectionCount: () => number;
  levelOf: (id: string) => number;
  isOwned: (id: string) => boolean;
  recruitCost: (id: string) => number;
  upgradeCost: (id: string) => number;
  unlockedRewards: () => UnlockedReward[];
  pendingPrestigeTokens: () => number;
  canPrestige: () => boolean;

  // ── actions ──
  tick: (deltaSec: number) => void;
  click: () => number;
  recruit: (id: string) => void;
  upgrade: (id: string) => void;
  grantOffline: (seconds: number) => number;
  touch: () => void;
  prestige: () => void;
  hardReset: () => void;
};

function rateOf(char: GameCharacter, level: number): number {
  return level <= 0 ? 0 : char.baseRate * level;
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      rp: 0,
      totalEarned: 0,
      owned: {},
      lastSeen: Date.now(),
      meritTokens: 0,
      prestigeCount: 0,

      productionMultiplier: () => 1 + get().meritTokens * TOKEN_BOOST,

      ratePerSec: () => {
        const { owned, productionMultiplier } = get();
        let raw = 0;
        for (const id in owned) {
          const char = CHARACTERS_BY_ID[id];
          if (char) raw += rateOf(char, owned[id]);
        }
        return raw * productionMultiplier();
      },

      clickPower: () =>
        CLICK_BASE + get().ratePerSec() * CLICK_RATE_FRACTION,

      collectionCount: () => Object.keys(get().owned).length,

      levelOf: (id) => get().owned[id] ?? 0,
      isOwned: (id) => (get().owned[id] ?? 0) > 0,

      recruitCost: (id) => CHARACTERS_BY_ID[id]?.unlockCost ?? Infinity,

      upgradeCost: (id) => {
        const char = CHARACTERS_BY_ID[id];
        const level = get().owned[id] ?? 0;
        if (!char || level <= 0) return Infinity;
        return Math.ceil(char.unlockCost * Math.pow(UPGRADE_GROWTH, level));
      },

      unlockedRewards: () => {
        const { owned } = get();
        const rewards: UnlockedReward[] = [];
        for (const char of CHARACTERS) {
          const level = owned[char.id] ?? 0;
          // Highest tier reached for this character is the active reward.
          let best: (typeof REWARD_TIERS)[number] | null = null;
          for (const tier of REWARD_TIERS) {
            if (level >= tier.level) best = tier;
          }
          if (best) {
            rewards.push({
              characterId: char.id,
              compound: char.compound,
              handle: char.handle,
              pct: best.pct,
              code: rewardCode(char, best.pct),
              tierLabel: best.label,
            });
          }
        }
        return rewards;
      },

      pendingPrestigeTokens: () => {
        // Classic sqrt curve — diminishing so prestige is a long arc.
        const earned = get().totalEarned;
        if (earned < PRESTIGE_THRESHOLD) return 0;
        return Math.floor(Math.sqrt(earned / PRESTIGE_THRESHOLD));
      },

      canPrestige: () => get().pendingPrestigeTokens() > 0,

      tick: (deltaSec) =>
        set((s) => {
          if (deltaSec <= 0) return s;
          const mult = 1 + s.meritTokens * TOKEN_BOOST;
          let raw = 0;
          for (const id in s.owned) {
            const char = CHARACTERS_BY_ID[id];
            if (char) raw += rateOf(char, s.owned[id]);
          }
          const gain = raw * mult * deltaSec;
          if (gain <= 0) return s;
          return {
            rp: s.rp + gain,
            totalEarned: s.totalEarned + gain,
          };
        }),

      click: () => {
        const gain = get().clickPower();
        set((s) => ({
          rp: s.rp + gain,
          totalEarned: s.totalEarned + gain,
        }));
        return gain;
      },

      recruit: (id) =>
        set((s) => {
          const char = CHARACTERS_BY_ID[id];
          if (!char) return s;
          if ((s.owned[id] ?? 0) > 0) return s; // already owned
          if (s.rp < char.unlockCost) return s;
          return {
            rp: s.rp - char.unlockCost,
            owned: { ...s.owned, [id]: 1 },
          };
        }),

      upgrade: (id) =>
        set((s) => {
          const char = CHARACTERS_BY_ID[id];
          const level = s.owned[id] ?? 0;
          if (!char || level <= 0) return s;
          const cost = Math.ceil(char.unlockCost * Math.pow(UPGRADE_GROWTH, level));
          if (s.rp < cost) return s;
          return {
            rp: s.rp - cost,
            owned: { ...s.owned, [id]: level + 1 },
          };
        }),

      grantOffline: (seconds) => {
        const capped = Math.min(seconds, OFFLINE_CAP_SECONDS);
        const gain = get().ratePerSec() * capped * OFFLINE_EFFICIENCY;
        if (gain > 0) {
          set((s) => ({
            rp: s.rp + gain,
            totalEarned: s.totalEarned + gain,
          }));
        }
        return gain;
      },

      touch: () => set({ lastSeen: Date.now() }),

      prestige: () =>
        set((s) => {
          const earned = s.totalEarned;
          const tokens =
            earned < PRESTIGE_THRESHOLD
              ? 0
              : Math.floor(Math.sqrt(earned / PRESTIGE_THRESHOLD));
          if (tokens <= 0) return s;
          return {
            rp: 0,
            owned: {},
            // totalEarned persists as a lifetime stat / prestige basis.
            meritTokens: s.meritTokens + tokens,
            prestigeCount: s.prestigeCount + 1,
          };
        }),

      hardReset: () =>
        set({
          rp: 0,
          totalEarned: 0,
          owned: {},
          lastSeen: Date.now(),
          meritTokens: 0,
          prestigeCount: 0,
        }),
    }),
    {
      name: 'merit-peptide-tycoon',
      partialize: (s) => ({
        rp: s.rp,
        totalEarned: s.totalEarned,
        owned: s.owned,
        lastSeen: s.lastSeen,
        meritTokens: s.meritTokens,
        prestigeCount: s.prestigeCount,
      }),
    },
  ),
);
