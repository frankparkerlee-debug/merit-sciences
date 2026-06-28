'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { CHARACTERS, CHARACTERS_BY_ID } from '@/lib/game/characters';
import { useGame, flushGameStorage, PRESTIGE_THRESHOLD } from '@/lib/game/store';
import { formatRP, formatRate, formatDuration } from '@/lib/game/format';
import { CharacterCard } from '@/components/game/CharacterCard';
import { PixelSprite } from '@/components/game/PixelSprite';

const TICK_MS = 100;
type Tab = 'lab' | 'roster' | 'locker';
type BuyAmount = '1' | '10' | 'max';
type Toast = { id: number; text: string };

export function PeptideTycoon() {
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('lab');
  const [buyAmount, setBuyAmount] = useState<BuyAmount>('1');
  const [offlineGain, setOfflineGain] = useState<{ gain: number; secs: number } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [floats, setFloats] = useState<{ id: number; x: number; y: number; v: number }[]>([]);
  const [pings, setPings] = useState<number[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const seq = useRef(0);
  const didInit = useRef(false);
  const prevOwned = useRef<Set<string>>(new Set());
  const prevRewards = useRef<Set<string>>(new Set());

  const store = useGame();

  const pushToast = useCallback((text: string) => {
    const id = seq.current++;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  // Mount once (StrictMode-safe via didInit): settle hydration + offline grant.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    setMounted(true);

    const last = useGame.getState().lastSeen;
    const secs = (Date.now() - last) / 1000;
    if (secs > 30 && useGame.getState().ratePerSec() > 0) {
      const gain = useGame.getState().grantOffline(secs);
      if (gain > 0) setOfflineGain({ gain, secs });
    }
    useGame.getState().touch();

    // Snapshot current progress so we only toast on NEW unlocks, not on load.
    prevOwned.current = new Set(Object.keys(useGame.getState().owned));
    prevRewards.current = new Set(
      useGame.getState().unlockedRewards().map((r) => `${r.characterId}:${r.pct}`),
    );
    setReady(true);
  }, []);

  // Idle tick + periodic + on-hide save (flush throttled storage to disk).
  useEffect(() => {
    if (!mounted) return;
    const tickId = setInterval(() => useGame.getState().tick(TICK_MS / 1000), TICK_MS);
    const saveId = setInterval(() => useGame.getState().touch(), 5000);
    const onHide = () => {
      useGame.getState().touch();
      flushGameStorage();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      clearInterval(tickId);
      clearInterval(saveId);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, [mounted]);

  // Celebratory toasts when a hero is recruited or a discount tier unlocks.
  const ownedIds = Object.keys(store.owned);
  const ownedKey = ownedIds.slice().sort().join(',');
  const rewards = store.unlockedRewards();
  const rewardKey = rewards.map((r) => `${r.characterId}:${r.pct}`).join('|');
  useEffect(() => {
    if (!ready) return;
    for (const id of ownedIds) {
      if (!prevOwned.current.has(id)) {
        const c = CHARACTERS_BY_ID[id];
        if (c) pushToast(`Recruited ${c.name} ${c.emoji}`);
      }
    }
    prevOwned.current = new Set(ownedIds);
    for (const r of rewards) {
      const key = `${r.characterId}:${r.pct}`;
      if (!prevRewards.current.has(key)) {
        pushToast(`🎟️ Unlocked ${r.pct}% off ${r.compound}!`);
      }
    }
    prevRewards.current = new Set(rewards.map((r) => `${r.characterId}:${r.pct}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedKey, rewardKey, ready]);

  const handleSynth = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const gain = useGame.getState().click();
    const rect = e.currentTarget.getBoundingClientRect();
    const id = seq.current++;
    setFloats((f) => [
      ...f.slice(-12),
      { id, x: e.clientX - rect.left, y: e.clientY - rect.top, v: gain },
    ]);
    setPings((p) => [...p.slice(-4), id]);
    setTimeout(() => {
      setFloats((f) => f.filter((fl) => fl.id !== id));
      setPings((p) => p.filter((pid) => pid !== id));
    }, 900);
  }, []);

  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    });
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-[70vh] grid place-items-center text-white/70">
        <div className="text-center">
          <div className="text-5xl animate-reactor">🧬</div>
          <div className="mt-4 font-pixel text-[11px] animate-pulse">BOOTING THE LAB…</div>
        </div>
      </div>
    );
  }

  const rate = store.ratePerSec();
  const collected = store.collectionCount();
  const total = CHARACTERS.length;
  const topHero = [...CHARACTERS]
    .filter((c) => store.isOwned(c.id))
    .sort((a, b) => b.baseRate * store.levelOf(b.id) - a.baseRate * store.levelOf(a.id))[0];
  const buyWant: number | 'max' = buyAmount === 'max' ? 'max' : Number(buyAmount);

  const shareText = buildShareText({ collected, total, rate, topHero: topHero?.name });

  return (
    <div className="max-w-container mx-auto px-3 sm:px-6 pb-28">
      {/* Brand strip */}
      <div className="mt-4 rounded-2xl bg-[#141a36] ring-1 ring-cobalt/30 text-white px-4 py-2.5 flex items-center justify-between gap-3">
        <p className="leading-tight">
          <span className="font-pixel text-[10px] sm:text-[12px]">PEPTIDE TYCOON</span>
          <span className="hidden sm:inline text-white/55 text-[12px]">
            {' '}· the heroes are jokes, the compounds are real
          </span>
        </p>
        <Link
          href="/catalog"
          className="shrink-0 rounded-full bg-white text-ink text-[11px] font-extrabold px-3.5 py-1.5 hover:bg-cream transition"
        >
          Shop Merit →
        </Link>
      </div>

      {/* ── HUD ─────────────────────────────────────────────────────────── */}
      <header className="mt-3 sticky top-2 z-30">
        <div className="scanlines pixel-frame rounded-2xl bg-gradient-to-br from-cobalt to-[#16236E] text-white p-4 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-pixel text-[8px] text-white/70">
                RESEARCH POINTS
              </p>
              <p className="font-display text-3xl sm:text-4xl font-extrabold tabular-nums leading-none">
                {formatRP(store.rp)}
              </p>
              <p className="mt-1 font-mono text-[12px] text-white/85">
                ▲ {formatRate(rate)} · ✋ {formatRP(store.clickPower())}/tap
              </p>
            </div>
            <button
              onClick={() => setShareOpen(true)}
              className="shrink-0 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur px-3.5 py-2 text-[12px] font-bold touch-manipulation transition active:scale-95"
            >
              Flex 🔗
            </button>
          </div>

          <div className="mt-3.5">
            <div className="flex items-center justify-between text-[11px] text-white/80 mb-1.5">
              <span className="font-bold">
                Collection · {collected}/{total}
              </span>
              {store.meritTokens > 0 && (
                <span className="font-mono">
                  ⭐ {store.meritTokens} · ×{store.productionMultiplier().toFixed(2)}
                </span>
              )}
            </div>
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-star to-[#FFE08A] transition-all duration-500"
                style={{ width: `${(collected / total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab nav ─────────────────────────────────────────────────────── */}
      <nav className="mt-4 grid grid-cols-3 gap-1.5 rounded-2xl bg-border-soft p-1.5 text-[13px] font-bold">
        {(
          [
            ['lab', '🧬 Lab'],
            ['roster', `🦸 Roster ${collected}/${total}`],
            ['locker', `🎟️ Locker ${rewards.length}`],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-xl py-2 touch-manipulation transition ${
              tab === id ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ── LAB ─────────────────────────────────────────────────────────── */}
      {tab === 'lab' && (
        <section className="mt-5">
          <div className="relative mx-auto max-w-sm">
            <button
              onClick={handleSynth}
              className="relative w-full aspect-square rounded-full touch-manipulation select-none active:scale-[0.98] transition"
              aria-label="Run a synthesis"
            >
              {/* pulsing reactor rings */}
              <span className="absolute inset-3 rounded-full bg-cobalt/10 animate-reactor" />
              <span className="absolute inset-8 rounded-full bg-cobalt/15 animate-reactor [animation-delay:0.4s]" />
              <span className="absolute inset-0 rounded-full ring-2 ring-cobalt/30" />
              <span className="scanlines absolute inset-[18%] rounded-full bg-gradient-to-br from-cobalt to-[#16236E] grid place-items-center shadow-[0_8px_30px_rgba(46,77,219,0.45)] ring-2 ring-white/15 overflow-hidden">
                <span className="block w-[58%] h-[58%]">
                  <PixelSprite emoji="🧬" res={22} pixel={6} />
                </span>
              </span>
              {/* tap ripples */}
              {pings.map((pid) => (
                <span
                  key={pid}
                  className="pointer-events-none absolute inset-[18%] rounded-full ring-2 ring-cobalt/60"
                  style={{ animation: 'ringPing 0.9s ease-out forwards' }}
                />
              ))}
            </button>
            {floats.map((f) => (
              <span
                key={f.id}
                className="pointer-events-none absolute font-mono font-extrabold text-cobalt text-base z-10 animate-[floatUp_0.9s_ease-out_forwards]"
                style={{ left: f.x, top: f.y }}
              >
                +{formatRP(f.v)}
              </span>
            ))}
          </div>
          <p className="mt-4 text-center font-pixel text-[12px] text-white">
            TAP TO SYNTHESIZE
          </p>
          <p className="mt-1.5 text-center text-[12px] text-white/60 font-mono">
            +{formatRP(store.clickPower())} RP per tap · your lab earns{' '}
            {formatRate(rate)} on its own
          </p>

          {/* Next recruit nudge */}
          {(() => {
            const next = CHARACTERS.find((c) => !store.isOwned(c.id));
            if (!next) {
              return (
                <div className="mt-6 rounded-2xl bg-star/10 ring-1 ring-star/40 p-4 text-center text-[13px] font-semibold text-[#8a5a08]">
                  🏆 Full roster assembled. You magnificent tycoon.
                </div>
              );
            }
            const afford = store.rp >= next.unlockCost;
            return (
              <button
                onClick={() => setTab('roster')}
                className="mt-6 w-full rounded-2xl bg-white ring-1 ring-border p-4 flex items-center gap-3 text-left touch-manipulation hover:ring-cobalt/40 transition"
              >
                <span className="block h-10 w-10 shrink-0">
                  <PixelSprite emoji={next.emoji} res={16} pixel={5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                    Next recruit
                  </span>
                  <span className="block font-display font-bold text-ink truncate">
                    {next.name}
                  </span>
                </span>
                <span
                  className={`shrink-0 font-mono text-[12px] font-bold ${
                    afford ? 'text-success' : 'text-ink-muted'
                  }`}
                >
                  {formatRP(next.unlockCost)} RP
                </span>
              </button>
            );
          })()}
        </section>
      )}

      {/* ── ROSTER ──────────────────────────────────────────────────────── */}
      {tab === 'roster' && (
        <section className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-white/70">
              Recruit all {total}. Each hero is a real Merit compound in disguise.
            </p>
            <div className="flex items-center gap-1 rounded-full bg-border-soft p-1 text-[11px] font-bold shrink-0">
              {(['1', '10', 'max'] as BuyAmount[]).map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBuyAmount(amt)}
                  className={`rounded-full px-2.5 py-1 touch-manipulation transition ${
                    buyAmount === amt ? 'bg-ink text-white' : 'text-ink-soft'
                  }`}
                >
                  {amt === 'max' ? 'Max' : `×${amt}`}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {CHARACTERS.map((char) => {
              const level = store.levelOf(char.id);
              const owned = level > 0;
              const preview = owned
                ? store.previewUpgrade(char.id, buyWant)
                : { count: 0, cost: Infinity };
              return (
                <CharacterCard
                  key={char.id}
                  char={char}
                  level={level}
                  canRecruit={!owned && store.rp >= char.unlockCost}
                  canUpgrade={owned && preview.count > 0 && store.rp >= preview.cost}
                  recruitCost={char.unlockCost}
                  upgradeCost={preview.cost}
                  upgradeLevels={Math.max(1, preview.count)}
                  onRecruit={store.recruit}
                  onUpgrade={store.upgrade}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ── LOCKER ──────────────────────────────────────────────────────── */}
      {tab === 'locker' && (
        <section className="mt-4">
          <h2 className="font-pixel text-[13px] text-white">🎟️ MERIT LOCKER</h2>
          <p className="text-[12px] text-white/70 mt-2">
            Level up heroes to unlock real discounts on the compounds they parody.
          </p>
          {rewards.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-white/25 p-6 text-center text-[13px] text-white/60">
              No rewards yet — get any hero to{' '}
              <strong className="text-white">Level 5</strong> to unlock your first
              discount code.
            </div>
          ) : (
            <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rewards.map((r) => {
                const char = CHARACTERS_BY_ID[r.characterId];
                return (
                  <div
                    key={r.characterId}
                    className="rounded-2xl bg-white ring-1 ring-success/40 p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-[8px] uppercase text-success">
                        {r.pct}% OFF · {r.tierLabel}
                      </span>
                      <span className="block h-7 w-7">
                        {char && <PixelSprite emoji={char.emoji} res={14} pixel={4} />}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-ink">{r.compound}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 rounded-lg bg-white ring-1 ring-border px-2.5 py-1.5 font-mono text-[13px] font-bold text-ink tracking-wide">
                        {r.code}
                      </code>
                      <button
                        onClick={() => copy(r.code, r.characterId)}
                        className="rounded-lg bg-success text-white text-[12px] font-bold px-3 py-1.5 touch-manipulation hover:opacity-90 transition"
                      >
                        {copied === r.characterId ? '✓' : 'Copy'}
                      </button>
                    </div>
                    <p className="mt-2 text-center text-[10px] text-ink-muted">
                      Applies to {r.compound} · one use per customer
                    </p>
                    <Link
                      href={`/products/${r.handle}`}
                      className="mt-1 block text-center text-[11px] font-bold text-cobalt hover:underline"
                    >
                      Redeem on {r.compound} →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          {/* Prestige */}
          <div className="mt-7 rounded-3xl bg-gradient-to-br from-cream to-[#ECE6D8] p-6 text-center">
            <h3 className="font-pixel text-[12px] text-ink">RESET THE LAB ⭐</h3>
            <p className="mt-1 text-[13px] text-ink-soft max-w-md mx-auto">
              Cash out your research for <strong>Merit Tokens</strong> — each one
              permanently boosts production +2%. Resets RP and roster. Copied
              Locker codes are yours to keep.
            </p>
            {store.canPrestige() ? (
              <button
                onClick={() => {
                  if (
                    confirm(
                      `Prestige now for ${store.pendingPrestigeTokens()} Merit Tokens? Your roster and RP reset.`,
                    )
                  ) {
                    store.prestige();
                    pushToast(`Prestiged! +${store.pendingPrestigeTokens()} ⭐`);
                    setTab('lab');
                  }
                }}
                className="mt-4 rounded-xl bg-star text-ink font-extrabold px-6 py-3 touch-manipulation hover:brightness-95 transition active:scale-95"
              >
                Prestige for {store.pendingPrestigeTokens()} ⭐
              </button>
            ) : (
              <p className="mt-4 text-[12px] font-mono text-ink-muted">
                Earn {formatRP(PRESTIGE_THRESHOLD)} lifetime RP to unlock (
                {formatRP(store.totalEarned)} so far)
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── Toasts ──────────────────────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-toast rounded-full bg-ink text-white text-[13px] font-bold px-4 py-2 shadow-lg"
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* Offline earnings modal */}
      {offlineGain && (
        <Modal onClose={() => setOfflineGain(null)}>
          <div className="text-center">
            <span className="text-5xl">🧪</span>
            <h3 className="mt-3 font-display text-xl font-extrabold text-ink">
              Welcome back, Director
            </h3>
            <p className="mt-1 text-[13px] text-ink-soft">
              Your lab ran for {formatDuration(offlineGain.secs)} while you were gone
              and synthesized:
            </p>
            <p className="mt-3 font-display text-3xl font-extrabold text-cobalt">
              +{formatRP(offlineGain.gain)} RP
            </p>
            <button
              onClick={() => setOfflineGain(null)}
              className="mt-5 w-full rounded-xl bg-cobalt text-white font-bold py-3 touch-manipulation hover:bg-cobalt/90 transition"
            >
              Collect
            </button>
          </div>
        </Modal>
      )}

      {/* Share / flex modal */}
      {shareOpen && (
        <Modal onClose={() => setShareOpen(false)}>
          <div className="text-center">
            <h3 className="font-display text-xl font-extrabold text-ink">Flex your lab</h3>
            <div className="mt-4 rounded-2xl bg-gradient-to-br from-cobalt to-[#16236E] text-white p-5 text-left relative overflow-hidden">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/65 font-bold">
                Merit · Peptide Tycoon
              </p>
              <p className="mt-2 font-display text-2xl font-extrabold">
                {collected}/{total} heroes collected
              </p>
              <p className="font-mono text-sm text-white/85">{formatRate(rate)}</p>
              {topHero && (
                <p className="mt-2 text-[13px]">
                  Final boss on my squad:{' '}
                  <span className="font-bold">
                    {topHero.name} {topHero.emoji}
                  </span>
                </p>
              )}
              <span className="pointer-events-none absolute -right-3 -bottom-4 text-7xl opacity-20">
                🧪
              </span>
            </div>
            <textarea
              readOnly
              value={shareText}
              className="mt-3 w-full h-24 rounded-xl border border-border p-3 text-[12px] text-ink-soft resize-none"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => copy(shareText, 'share')}
                className="rounded-xl bg-ink text-white font-bold py-2.5 text-sm touch-manipulation hover:bg-steel transition"
              >
                {copied === 'share' ? 'Copied!' : 'Copy'}
              </button>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-cobalt text-white font-bold py-2.5 text-sm hover:bg-cobalt/90 transition grid place-items-center"
              >
                Share on X
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function buildShareText({
  collected,
  total,
  rate,
  topHero,
}: {
  collected: number;
  total: number;
  rate: number;
  topHero?: string;
}): string {
  const boss = topHero ? ` My final boss: ${topHero}.` : '';
  return `I'm running a peptide lab in Merit's Peptide Tycoon 🧪 — collected ${collected}/${total} heroes, generating ${formatRate(
    rate,
  )}.${boss} Build yours 👉 meritsciences.com/game`;
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-ink/50 backdrop-blur-sm p-4 animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
