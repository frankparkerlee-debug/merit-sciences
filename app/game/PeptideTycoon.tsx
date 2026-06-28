'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { CHARACTERS, CHARACTERS_BY_ID } from '@/lib/game/characters';
import { useGame, PRESTIGE_THRESHOLD } from '@/lib/game/store';
import { formatRP, formatRate, formatDuration } from '@/lib/game/format';
import { CharacterCard } from '@/components/game/CharacterCard';

const TICK_MS = 100;

export function PeptideTycoon() {
  const [mounted, setMounted] = useState(false);
  const [offlineGain, setOfflineGain] = useState<{ gain: number; secs: number } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [floats, setFloats] = useState<{ id: number; x: number; y: number; v: number }[]>([]);
  const floatSeq = useRef(0);

  const store = useGame();

  // Mount: settle hydration, then grant offline earnings once.
  useEffect(() => {
    setMounted(true);
    const last = useGame.getState().lastSeen;
    const secs = (Date.now() - last) / 1000;
    if (secs > 30 && useGame.getState().ratePerSec() > 0) {
      const gain = useGame.getState().grantOffline(secs);
      if (gain > 0) setOfflineGain({ gain, secs });
    }
    useGame.getState().touch();
  }, []);

  // Idle tick + periodic lastSeen save.
  useEffect(() => {
    if (!mounted) return;
    const tickId = setInterval(() => useGame.getState().tick(TICK_MS / 1000), TICK_MS);
    const saveId = setInterval(() => useGame.getState().touch(), 5000);
    const onHide = () => useGame.getState().touch();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onHide);
    return () => {
      clearInterval(tickId);
      clearInterval(saveId);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onHide);
    };
  }, [mounted]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const gain = useGame.getState().click();
      const rect = e.currentTarget.getBoundingClientRect();
      const id = floatSeq.current++;
      setFloats((f) => [
        ...f,
        {
          id,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          v: gain,
        },
      ]);
      setTimeout(() => setFloats((f) => f.filter((fl) => fl.id !== id)), 900);
    },
    [],
  );

  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    });
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-ink-muted">
        <div className="animate-pulse font-mono text-sm">Booting the lab…</div>
      </div>
    );
  }

  const rate = store.ratePerSec();
  const rewards = store.unlockedRewards();
  const collected = store.collectionCount();
  const total = CHARACTERS.length;
  const topHero = [...CHARACTERS]
    .filter((c) => store.isOwned(c.id))
    .sort((a, b) => b.baseRate * store.levelOf(b.id) - a.baseRate * store.levelOf(a.id))[0];

  const shareText = buildShareText({
    collected,
    total,
    rate,
    topHero: topHero?.name,
  });

  return (
    <div className="max-w-container mx-auto px-4 sm:px-8 pb-24">
      {/* Brand promo strip — the game exists to sell the real thing. */}
      <div className="mt-6 rounded-2xl bg-ink text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] sm:text-sm">
          <span className="font-display font-bold">Peptide Tycoon</span>
          <span className="text-white/60">
            {' '}
            — a game by Merit. The heroes are jokes. The compounds are real.
          </span>
        </p>
        <Link
          href="/catalog"
          className="shrink-0 rounded-full bg-white text-ink text-[12px] font-bold px-4 py-1.5 hover:bg-cream transition"
        >
          Shop Merit →
        </Link>
      </div>

      {/* Hero / stat dashboard */}
      <header className="mt-5 rounded-3xl bg-gradient-to-br from-cobalt to-[#1B2E8C] text-white p-6 sm:p-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/70 font-bold">
                Research Points
              </p>
              <p className="font-display text-4xl sm:text-5xl font-extrabold tabular-nums">
                {formatRP(store.rp)}
              </p>
              <p className="mt-1 font-mono text-sm text-white/80">{formatRate(rate)}</p>
            </div>
            <button
              onClick={() => setShareOpen(true)}
              className="rounded-full bg-white/15 hover:bg-white/25 backdrop-blur px-4 py-2 text-[12px] font-bold transition"
            >
              Flex 🔗
            </button>
          </div>

          {/* Collection progress */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-[12px] text-white/80 mb-1.5">
              <span className="font-semibold">
                Roster · {collected}/{total} heroes
              </span>
              {store.meritTokens > 0 && (
                <span>
                  ⭐ {store.meritTokens} Merit Tokens (×
                  {store.productionMultiplier().toFixed(2)})
                </span>
              )}
            </div>
            <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-star transition-all duration-500"
                style={{ width: `${(collected / total) * 100}%` }}
              />
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-8 -bottom-10 text-[160px] opacity-10 select-none">
          🧪
        </div>
      </header>

      {/* The clicker */}
      <div className="mt-5 relative">
        <button
          onClick={handleClick}
          className="w-full rounded-3xl bg-white ring-1 ring-border py-6 text-center active:scale-[0.99] transition select-none"
        >
          <span className="block text-5xl">🧬</span>
          <span className="mt-2 block font-display font-bold text-ink">
            Run a synthesis
          </span>
          <span className="block text-[12px] text-ink-muted font-mono">
            +{formatRP(store.clickPower())} RP / tap
          </span>
        </button>
        {floats.map((f) => (
          <span
            key={f.id}
            className="pointer-events-none absolute font-mono font-bold text-cobalt text-sm animate-[floatUp_0.9s_ease-out_forwards]"
            style={{ left: f.x, top: f.y }}
          >
            +{formatRP(f.v)}
          </span>
        ))}
      </div>

      {/* Merit Locker — unlocked discount rewards */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">🎟️ Merit Locker</h2>
          <span className="text-[12px] text-ink-muted">{rewards.length} unlocked</span>
        </div>
        <p className="text-[12px] text-ink-soft mt-0.5">
          Level up heroes to unlock real discounts on the compounds they parody.
        </p>
        {rewards.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border p-5 text-center text-[13px] text-ink-muted">
            No rewards yet — get any hero to <strong>Level 5</strong> to unlock your
            first discount code.
          </div>
        ) : (
          <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rewards.map((r) => {
              const char = CHARACTERS_BY_ID[r.characterId];
              return (
                <div
                  key={r.characterId}
                  className="rounded-2xl bg-success/5 ring-1 ring-success/30 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-success">
                      {r.pct}% OFF · {r.tierLabel}
                    </span>
                    <span className="text-xl">{char?.emoji}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ink">{r.compound}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 rounded-lg bg-white ring-1 ring-border px-2.5 py-1.5 font-mono text-[13px] font-bold text-ink tracking-wide">
                      {r.code}
                    </code>
                    <button
                      onClick={() => copy(r.code, r.characterId)}
                      className="rounded-lg bg-success text-white text-[12px] font-bold px-3 py-1.5 hover:opacity-90 transition"
                    >
                      {copied === r.characterId ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <Link
                    href={`/products/${r.handle}`}
                    className="mt-2 block text-center text-[11px] font-semibold text-cobalt hover:underline"
                  >
                    Redeem on {r.compound} →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Roster */}
      <section className="mt-9">
        <h2 className="font-display text-lg font-bold text-ink">The Roster</h2>
        <p className="text-[12px] text-ink-soft mt-0.5">
          Recruit all {total}. Each hero is a real Merit compound in disguise.
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {CHARACTERS.map((char) => (
            <CharacterCard
              key={char.id}
              char={char}
              level={store.levelOf(char.id)}
              rp={store.rp}
              recruitCost={store.recruitCost(char.id)}
              upgradeCost={store.upgradeCost(char.id)}
              onRecruit={() => store.recruit(char.id)}
              onUpgrade={() => store.upgrade(char.id)}
            />
          ))}
        </div>
      </section>

      {/* Prestige */}
      <section className="mt-10 rounded-3xl bg-cream p-6 text-center">
        <h2 className="font-display text-lg font-bold text-ink">Reset the Lab ⭐</h2>
        <p className="mt-1 text-[13px] text-ink-soft max-w-md mx-auto">
          Cash out your research for <strong>Merit Tokens</strong> — each one
          permanently boosts production +2%. Resets RP and your roster (Locker
          codes you&apos;ve already copied are yours to keep).
        </p>
        {store.canPrestige() ? (
          <button
            onClick={() => {
              if (
                confirm(
                  `Prestige now for ${store.pendingPrestigeTokens()} Merit Tokens? Your roster and RP reset.`,
                )
              )
                store.prestige();
            }}
            className="mt-4 rounded-xl bg-star text-ink font-bold px-6 py-3 hover:brightness-95 transition"
          >
            Prestige for {store.pendingPrestigeTokens()} ⭐
          </button>
        ) : (
          <p className="mt-4 text-[12px] font-mono text-ink-muted">
            Earn {formatRP(PRESTIGE_THRESHOLD)} lifetime RP to unlock prestige (
            {formatRP(store.totalEarned)} so far)
          </p>
        )}
      </section>

      {/* Offline earnings modal */}
      {offlineGain && (
        <Modal onClose={() => setOfflineGain(null)}>
          <div className="text-center">
            <span className="text-5xl">🧪</span>
            <h3 className="mt-3 font-display text-xl font-bold text-ink">
              Welcome back, Director
            </h3>
            <p className="mt-1 text-[13px] text-ink-soft">
              Your lab ran for {formatDuration(offlineGain.secs)} while you were
              gone and synthesized:
            </p>
            <p className="mt-3 font-display text-3xl font-extrabold text-cobalt">
              +{formatRP(offlineGain.gain)} RP
            </p>
            <button
              onClick={() => setOfflineGain(null)}
              className="mt-5 w-full rounded-xl bg-cobalt text-white font-semibold py-3 hover:bg-cobalt/90 transition"
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
            <h3 className="font-display text-xl font-bold text-ink">Flex your lab</h3>
            <div className="mt-4 rounded-2xl bg-gradient-to-br from-cobalt to-[#1B2E8C] text-white p-5 text-left">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/70 font-bold">
                Merit · Peptide Tycoon
              </p>
              <p className="mt-2 font-display text-2xl font-extrabold">
                {collected}/{total} heroes collected
              </p>
              <p className="font-mono text-sm text-white/85">{formatRate(rate)}</p>
              {topHero && (
                <p className="mt-2 text-[13px]">
                  Final boss on my squad:{' '}
                  <span className="font-bold">{topHero.name}</span>
                </p>
              )}
            </div>
            <textarea
              readOnly
              value={shareText}
              className="mt-3 w-full h-24 rounded-xl border border-border p-3 text-[12px] text-ink-soft resize-none"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => copy(shareText, 'share')}
                className="rounded-xl bg-ink text-white font-semibold py-2.5 text-sm hover:bg-steel transition"
              >
                {copied === 'share' ? 'Copied!' : 'Copy'}
              </button>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-cobalt text-white font-semibold py-2.5 text-sm hover:bg-cobalt/90 transition grid place-items-center"
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
      className="fixed inset-0 z-50 grid place-items-center bg-ink/50 backdrop-blur-sm p-4 animate-[fadeIn_0.15s_ease-out]"
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
