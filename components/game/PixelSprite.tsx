'use client';

import { useEffect, useRef } from 'react';

type Props = {
  /** The emoji to "demake" into a pixel sprite. */
  emoji: string;
  /** Source grid resolution — lower = chunkier / more retro. */
  res?: number;
  /** Upscale factor for the backing canvas (crispness of the blocks). */
  pixel?: number;
  className?: string;
};

/**
 * Turns any emoji into a nostalgic ~128-bit pixel sprite — no art assets.
 *
 * We paint the emoji onto a tiny `res`×`res` offscreen canvas, then blit it
 * upscaled with image smoothing OFF so it snaps to hard pixel blocks. The
 * player's own device emoji font supplies the colors, so every hero gets a
 * consistent chunky-sprite look for free. Drawn once per emoji.
 */
export function PixelSprite({ emoji, res = 18, pixel = 5, className = '' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const size = res * pixel;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const off = document.createElement('canvas');
    off.width = res;
    off.height = res;
    const octx = off.getContext('2d');
    if (!octx) return;

    octx.clearRect(0, 0, res, res);
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.font = `${Math.floor(res * 0.84)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    octx.fillText(emoji, res / 2, Math.floor(res * 0.54));

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(off, 0, 0, res, res, 0, 0, size, size);
  }, [emoji, res, pixel, size]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      role="img"
      aria-label={emoji}
      className={className}
      style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}
    />
  );
}
