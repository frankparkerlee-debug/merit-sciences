// Compact big-number formatting for the idle economy. Idle games live or die
// on readable huge numbers — 1.24M reads instantly, 1240000 does not.
const SUFFIXES = [
  '',
  'K',
  'M',
  'B',
  'T',
  'Qa',
  'Qi',
  'Sx',
  'Sp',
  'Oc',
  'No',
  'Dc',
];

export function formatRP(n: number): string {
  if (!isFinite(n)) return '∞';
  if (n < 1000) return Math.floor(n).toString();
  const tier = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(n) / 3));
  const scaled = n / Math.pow(10, tier * 3);
  // 2 decimals under 100, 1 above, to keep width stable (e.g. 12.4M, 1.24M)
  const decimals = scaled < 100 ? 2 : 1;
  return `${scaled.toFixed(decimals)}${SUFFIXES[tier]}`;
}

export function formatRate(n: number): string {
  return `${formatRP(n)}/sec`;
}

/** "2h 14m", "3m 02s", "8s" — for offline-earnings + cooldown copy. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec.toString().padStart(2, '0')}s`;
  return `${sec}s`;
}
