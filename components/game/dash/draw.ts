// Hand-coded vector art for Peptide Dash. Everything is drawn with canvas
// path ops (no image assets) so it stays crisp at any DPR and we can tint the
// hero per character. All coordinates are in CSS pixels; the component scales
// the context for devicePixelRatio.

export type RunnerMode = 'run' | 'jump' | 'hurt';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * The player: a little "peptide vial" creature with a tinted liquid body,
 * googly eyes, a cap, and animated legs. Centered horizontally at cx, feet
 * resting on footY.
 */
export function drawRunner(
  ctx: CanvasRenderingContext2D,
  cx: number,
  footY: number,
  height: number,
  color: string,
  phase: number,
  mode: RunnerMode,
) {
  const bodyW = height * 0.6;
  const bodyH = height * 0.82;
  const legLen = height * 0.16;
  const bob = mode === 'run' ? Math.sin(phase * 2) * height * 0.03 : 0;
  const topY = footY - bodyH - legLen + bob;
  const left = cx - bodyW / 2;

  ctx.save();
  if (mode === 'hurt') {
    ctx.translate(cx, footY - bodyH / 2);
    ctx.rotate(-0.2);
    ctx.translate(-cx, -(footY - bodyH / 2));
  }

  // ── Legs ──
  ctx.strokeStyle = '#0B0F19';
  ctx.lineWidth = Math.max(2, height * 0.05);
  ctx.lineCap = 'round';
  const hipY = topY + bodyH;
  if (mode === 'run') {
    const swing = Math.sin(phase) * bodyW * 0.32;
    for (const s of [swing, -swing]) {
      ctx.beginPath();
      ctx.moveTo(cx - bodyW * 0.18, hipY);
      ctx.lineTo(cx - bodyW * 0.18 + s, hipY + legLen);
      ctx.stroke();
    }
  } else {
    // tucked / together for jump + hurt
    for (const dx of [-bodyW * 0.18, bodyW * 0.18]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx, hipY);
      ctx.lineTo(cx + dx, hipY + legLen * 0.6);
      ctx.stroke();
    }
  }

  // ── Vial body (rounded, tinted lower portion = "liquid") ──
  roundRect(ctx, left, topY, bodyW, bodyH, bodyW * 0.42);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  // liquid fill
  ctx.save();
  roundRect(ctx, left, topY, bodyW, bodyH, bodyW * 0.42);
  ctx.clip();
  const liquidTop = topY + bodyH * 0.34;
  ctx.fillStyle = color;
  ctx.fillRect(left, liquidTop, bodyW, bodyH);
  // shine
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(left + bodyW * 0.16, topY + bodyH * 0.1, bodyW * 0.14, bodyH * 0.8);
  ctx.restore();
  // outline
  ctx.strokeStyle = '#0B0F19';
  ctx.lineWidth = Math.max(2, height * 0.045);
  roundRect(ctx, left, topY, bodyW, bodyH, bodyW * 0.42);
  ctx.stroke();

  // ── Cap ──
  const capH = bodyH * 0.16;
  roundRect(ctx, left + bodyW * 0.12, topY - capH * 0.7, bodyW * 0.76, capH, capH * 0.4);
  ctx.fillStyle = '#4A5160';
  ctx.fill();
  ctx.stroke();

  // ── Eyes ──
  const eyeY = topY + bodyH * 0.5;
  const eyeR = bodyW * 0.13;
  const look = mode === 'jump' ? -eyeR * 0.3 : 0;
  for (const ex of [cx - bodyW * 0.18, cx + bodyW * 0.18]) {
    ctx.beginPath();
    ctx.fillStyle = '#FFFFFF';
    ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0B0F19';
    ctx.lineWidth = Math.max(1, height * 0.018);
    ctx.stroke();
    if (mode === 'hurt') {
      // X eyes
      ctx.beginPath();
      ctx.moveTo(ex - eyeR * 0.5, eyeY - eyeR * 0.5);
      ctx.lineTo(ex + eyeR * 0.5, eyeY + eyeR * 0.5);
      ctx.moveTo(ex + eyeR * 0.5, eyeY - eyeR * 0.5);
      ctx.lineTo(ex - eyeR * 0.5, eyeY + eyeR * 0.5);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.fillStyle = '#0B0F19';
      ctx.arc(ex, eyeY + look, eyeR * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A collectible vial (score pickup). cx,cy = center. */
export function drawVial(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
  phase: number,
) {
  const w = size * 0.5;
  const h = size;
  const float = Math.sin(phase) * size * 0.08;
  const x = cx - w / 2;
  const y = cy - h / 2 + float;
  ctx.save();
  roundRect(ctx, x, y, w, h, w * 0.45);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.save();
  roundRect(ctx, x, y, w, h, w * 0.45);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.fillRect(x, y + h * 0.4, w, h);
  ctx.restore();
  ctx.strokeStyle = '#0B0F19';
  ctx.lineWidth = Math.max(1.5, size * 0.06);
  roundRect(ctx, x, y, w, h, w * 0.45);
  ctx.stroke();
  // cap
  ctx.fillStyle = '#4A5160';
  roundRect(ctx, x + w * 0.1, y - h * 0.08, w * 0.8, h * 0.14, h * 0.06);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export type ObstacleKind = 'sugar' | 'cortisol';

/** Ground obstacles. x,y = top-left of bounding box, s = size (square-ish). */
export function drawObstacle(
  ctx: CanvasRenderingContext2D,
  kind: ObstacleKind,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.save();
  if (kind === 'sugar') {
    // White sugar cube with a grid + sparkle
    roundRect(ctx, x, y, w, h, w * 0.16);
    ctx.fillStyle = '#F4F1EA';
    ctx.fill();
    ctx.strokeStyle = '#0B0F19';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(11,15,25,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + 3);
    ctx.lineTo(x + w / 2, y + h - 3);
    ctx.moveTo(x + 3, y + h / 2);
    ctx.lineTo(x + w - 3, y + h / 2);
    ctx.stroke();
  } else {
    // Cortisol blob — spiky dark cloud
    ctx.fillStyle = '#6B5B95';
    ctx.strokeStyle = '#0B0F19';
    ctx.lineWidth = 2;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) / 2;
    ctx.beginPath();
    const spikes = 9;
    for (let i = 0; i <= spikes * 2; i++) {
      const ang = (Math.PI * i) / spikes;
      const rad = i % 2 === 0 ? r : r * 0.7;
      const px = cx + Math.cos(ang) * rad;
      const py = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // grumpy eyes
    ctx.fillStyle = '#FFFFFF';
    for (const dx of [-r * 0.32, r * 0.32]) {
      ctx.beginPath();
      ctx.arc(cx + dx, cy - r * 0.1, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Parallax background: night-lab gradient, drifting molecules, hills. */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scrollX: number,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#0c1024');
  sky.addColorStop(1, '#1b2a6b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // drifting molecule dots (slow parallax)
  ctx.fillStyle = 'rgba(107,138,255,0.25)';
  const spacing = 90;
  const off = (scrollX * 0.2) % spacing;
  for (let gx = -off; gx < w + spacing; gx += spacing) {
    for (let gy = 30; gy < h * 0.7; gy += spacing) {
      const yy = gy + Math.sin((gx + gy) * 0.05) * 8;
      ctx.beginPath();
      ctx.arc(gx, yy, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // back hills (faster parallax)
  ctx.fillStyle = '#16236E';
  const hillOff = (scrollX * 0.5) % 260;
  ctx.beginPath();
  ctx.moveTo(-hillOff, h);
  for (let i = -1; i < w / 260 + 2; i++) {
    const bx = -hillOff + i * 260;
    ctx.quadraticCurveTo(bx + 130, h * 0.62, bx + 260, h * 0.78);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}
