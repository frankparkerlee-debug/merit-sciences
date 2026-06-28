'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  drawBackground,
  drawObstacle,
  drawRunner,
  drawVial,
  type ObstacleKind,
} from './draw';

const BEST_KEY = 'merit-dash-best';

type Obstacle = { x: number; w: number; h: number; kind: ObstacleKind };
type Pickup = { x: number; y: number; r: number; phase: number; gone: boolean };

type Game = {
  w: number;
  h: number;
  groundY: number;
  runnerH: number;
  playerX: number;
  playerY: number; // feet
  vy: number;
  jumps: number;
  onGround: boolean;
  speed: number;
  distance: number;
  vials: number;
  phase: number;
  scrollX: number;
  obstacles: Obstacle[];
  pickups: Pickup[];
  nextObstacleX: number;
  nextPickupX: number;
  dead: boolean;
};

const GRAVITY = 2600; // px/s^2
const JUMP_V = 880; // px/s
const MAX_JUMPS = 2;
const BASE_SPEED = 300; // px/s
const MAX_SPEED = 760;

type Props = {
  /** Hero tint for the runner. */
  color?: string;
  heroName?: string;
  /** Credit RP earned from the run into the meta-game. */
  onAward?: (rp: number) => void;
};

function PeptideDashImpl({ color = '#2E4DDB', heroName = 'your peptide', onAward }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gRef = useRef<Game | null>(null);
  const [status, setStatus] = useState<'menu' | 'playing' | 'over'>('menu');
  const [best, setBest] = useState(0);
  const [result, setResult] = useState<{ score: number; vials: number; rp: number; isBest: boolean } | null>(null);

  useEffect(() => {
    const stored = Number(localStorage.getItem(BEST_KEY) || 0);
    if (stored > 0) setBest(stored);
  }, []);

  const scoreOf = (g: Game) => Math.floor(g.distance / 10) + g.vials * 25;

  const endGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    const score = scoreOf(g);
    const rp = score;
    const prevBest = Number(localStorage.getItem(BEST_KEY) || 0);
    const isBest = score > prevBest;
    if (isBest) {
      localStorage.setItem(BEST_KEY, String(score));
      setBest(score);
    }
    onAward?.(rp);
    setResult({ score, vials: g.vials, rp, isBest });
    setStatus('over');
  }, [onAward]);

  useEffect(() => {
    if (status !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let running = true;
    let dpr = 1;

    const sizeAndInit = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const groundY = cssH * 0.84;
      const runnerH = cssH * 0.26;
      const prev = gRef.current;
      if (!prev) {
        gRef.current = {
          w: cssW,
          h: cssH,
          groundY,
          runnerH,
          playerX: cssW * 0.22,
          playerY: groundY,
          vy: 0,
          jumps: 0,
          onGround: true,
          speed: BASE_SPEED,
          distance: 0,
          vials: 0,
          phase: 0,
          scrollX: 0,
          obstacles: [],
          pickups: [],
          nextObstacleX: cssW * 0.9,
          nextPickupX: cssW * 0.6,
          dead: false,
        };
      } else {
        // resize mid-run: keep state, refresh dims
        prev.w = cssW;
        prev.h = cssH;
        prev.groundY = groundY;
        prev.runnerH = runnerH;
        prev.playerX = cssW * 0.22;
        if (prev.onGround) prev.playerY = groundY;
      }
    };
    sizeAndInit();

    const jump = () => {
      const g = gRef.current;
      if (!g || g.dead) return;
      if (g.jumps < MAX_JUMPS) {
        g.vy = -JUMP_V;
        g.onGround = false;
        g.jumps++;
      }
    };
    const onPointer = (e: PointerEvent) => {
      e.preventDefault();
      jump();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        jump();
      }
    };
    canvas.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    const onResize = () => sizeAndInit();
    window.addEventListener('resize', onResize);

    const update = (dt: number) => {
      const g = gRef.current!;
      g.speed = Math.min(MAX_SPEED, BASE_SPEED + g.distance * 0.02);
      const dx = g.speed * dt;
      g.distance += dx;
      g.scrollX += dx;
      g.phase += dx * 0.03;

      // physics
      g.vy += GRAVITY * dt;
      g.playerY += g.vy * dt;
      if (g.playerY >= g.groundY) {
        g.playerY = g.groundY;
        g.vy = 0;
        g.onGround = true;
        g.jumps = 0;
      }

      // move obstacles + pickups left
      for (const o of g.obstacles) o.x -= dx;
      for (const p of g.pickups) p.x -= dx;
      g.obstacles = g.obstacles.filter((o) => o.x + o.w > -20);
      g.pickups = g.pickups.filter((p) => p.x > -20 && !p.gone);

      // spawn obstacles
      g.nextObstacleX -= dx;
      if (g.nextObstacleX <= g.w) {
        const kind: ObstacleKind = Math.random() > 0.5 ? 'sugar' : 'cortisol';
        const size = g.h * (0.12 + Math.random() * 0.08);
        g.obstacles.push({ x: g.w + 20, w: size, h: size, kind });
        // gap shrinks slightly as speed rises (kept jumpable)
        const minGap = g.runnerH * 3.2;
        const gap = minGap + Math.random() * g.runnerH * 3.5;
        g.nextObstacleX = g.w + gap;
      }

      // spawn pickups (vials) at jump-reachable heights
      g.nextPickupX -= dx;
      if (g.nextPickupX <= g.w) {
        const raised = Math.random() > 0.5;
        const y = raised
          ? g.groundY - g.runnerH * (1.2 + Math.random() * 0.8)
          : g.groundY - g.runnerH * 0.4;
        g.pickups.push({ x: g.w + 20, y, r: g.h * 0.04, phase: Math.random() * 6, gone: false });
        g.nextPickupX = g.w + g.runnerH * (2.5 + Math.random() * 3);
      }

      // player hitbox (slightly forgiving)
      const pw = g.runnerH * 0.46;
      const ph = g.runnerH * 0.9;
      const px = g.playerX - pw / 2;
      const py = g.playerY - ph;

      // obstacle collisions
      for (const o of g.obstacles) {
        const oy = g.groundY - o.h;
        if (px < o.x + o.w && px + pw > o.x && py < oy + o.h && py + ph > oy) {
          g.dead = true;
          return;
        }
      }
      // pickups
      for (const p of g.pickups) {
        const dxp = g.playerX - p.x;
        const dyp = (g.playerY - ph / 2) - p.y;
        if (Math.hypot(dxp, dyp) < p.r + pw * 0.7) {
          p.gone = true;
          g.vials++;
        }
      }
    };

    const render = () => {
      const g = gRef.current!;
      drawBackground(ctx, g.w, g.h, g.scrollX);
      // ground
      ctx.fillStyle = '#0f1630';
      ctx.fillRect(0, g.groundY, g.w, g.h - g.groundY);
      ctx.strokeStyle = 'rgba(107,138,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, g.groundY);
      ctx.lineTo(g.w, g.groundY);
      ctx.stroke();

      for (const p of g.pickups) drawVial(ctx, p.x, p.y, g.h * 0.09, '#6B8AFF', p.phase + g.phase);
      for (const o of g.obstacles) drawObstacle(ctx, o.kind, o.x, g.groundY - o.h, o.w, o.h);

      const mode = g.onGround ? 'run' : 'jump';
      drawRunner(ctx, g.playerX, g.playerY, g.runnerH, color, g.phase, mode);

      // HUD score (drawn on canvas to avoid 60fps React updates)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 20px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${scoreOf(g)}`, 16, 30);
      ctx.font = '600 12px ui-monospace, monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(`🧪 ${g.vials}`, 16, 50);
    };

    let last = performance.now();
    const frame = (t: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      update(dt);
      render();
      if (gRef.current!.dead) {
        running = false;
        endGame();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [status, color, endGame]);

  const start = () => {
    gRef.current = null; // forces fresh init in the effect
    setResult(null);
    setStatus('playing');
  };

  const shareText = result
    ? `I ran ${result.score}m as ${heroName} in Merit's Peptide Dash 🏃🧪 — can you beat it? Play 👉 meritsciences.com/game`
    : '';

  return (
    <div className="relative w-full rounded-2xl overflow-hidden ring-1 ring-cobalt/30 bg-[#0c1024] select-none">
      <canvas
        ref={canvasRef}
        className="block w-full h-[58vh] max-h-[460px] touch-none"
      />

      {status === 'menu' && (
        <Overlay>
          <p className="font-pixel text-[14px] text-white">PEPTIDE DASH</p>
          <p className="mt-3 text-[13px] text-white/75 max-w-xs">
            Run as {heroName}. Tap / Space to jump (double-tap for a double
            jump). Dodge sugar & cortisol, grab vials. Distance = score = RP.
          </p>
          <button
            onClick={start}
            className="mt-5 rounded-xl bg-star text-ink font-extrabold px-7 py-3 touch-manipulation active:scale-95 transition"
          >
            ▶ Start running
          </button>
          {best > 0 && (
            <p className="mt-3 font-mono text-[12px] text-white/60">Best: {best}m</p>
          )}
        </Overlay>
      )}

      {status === 'over' && result && (
        <Overlay>
          <p className="font-pixel text-[12px] text-white">
            {result.isBest ? '🏆 NEW BEST!' : 'WIPEOUT'}
          </p>
          <p className="mt-3 font-display text-4xl font-extrabold text-white tabular-nums">
            {result.score}
            <span className="text-lg text-white/60">m</span>
          </p>
          <p className="mt-1 font-mono text-[12px] text-white/70">
            🧪 {result.vials} vials · +{result.rp} RP earned
          </p>
          <div className="mt-5 flex gap-2">
            <button
              onClick={start}
              className="rounded-xl bg-cobalt text-white font-bold px-5 py-2.5 touch-manipulation active:scale-95 transition"
            >
              ↻ Run again
            </button>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-white/15 text-white font-bold px-5 py-2.5 grid place-items-center hover:bg-white/25 transition"
            >
              Flex 🔗
            </a>
          </div>
          <p className="mt-3 font-mono text-[11px] text-white/50">Best: {best}m</p>
        </Overlay>
      )}
    </div>
  );
}

// Memoized so the parent's 10Hz idle tick can't re-render the runner mid-game.
export const PeptideDash = memo(PeptideDashImpl);

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-ink/55 backdrop-blur-[2px] text-center px-6">
      <div className="flex flex-col items-center">{children}</div>
    </div>
  );
}
