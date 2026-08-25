import 'server-only';
import { prisma } from './db';
import { sendEmail } from './email';

/* ─────────────────────────────────────────────────────────────────────────
   LIST HEALTH MONITOR — the alarm that was missing.

   The footer list-bombing ran for TWO MONTHS (June→August 2026) at 30-43
   fake signups/day because nothing watched signup quality; it was found by
   accident during an analytics build. This module is the standing watch:

     · DAILY  — anomaly check. Emails ops ONLY when something looks like an
                attack: a source growing fast with zero buyer conversion, or
                a single-day signup spike.
     · MONDAY — a one-screen digest of list composition and 7-day movement,
                sent even when healthy, so "quiet" is a verified state
                rather than an assumption.

   Scheduling is STATELESS: the ops-notify cron runs every 15 minutes and
   calls maybeRunListHealth(), which acts only in the 12:00-12:15 UTC
   window (daily check) and additionally sends the digest when that day is
   Monday. One window → one send; no schedule table, no new cron job.
   ───────────────────────────────────────────────────────────────────────── */

const OPS_TO = process.env.OPS_NOTIFY_EMAIL || 'info@meritsciences.com';

/** A source is anomalous when it grows like a campaign but converts like a
 *  bot list. The footer attack would have tripped this in its first week. */
const ANOMALY_7D_SIGNUPS = 25;
const ANOMALY_1D_SIGNUPS = 15;

type SourceStat = {
  source: string;
  last7d: number;
  maxDay: number;
  totalActive: number;
  lifetimeBuyers: number;
};

async function collectStats(): Promise<{ stats: SourceStat[]; quarantined: number }> {
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [subs, quarantined] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      select: { email: true, source: true, isSubscribed: true, createdAt: true },
    }),
    prisma.newsletterSubscriber.count({ where: { tags: { hasSome: ['scrub-2026-08-footer-listbomb'] } } }),
  ]);

  // Buyer conversion per source — the one signal bots cannot fake.
  const buyers = new Set(
    (
      await prisma.order.findMany({
        where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'PARTIALLY_REFUNDED'] as any } },
        select: { customerEmail: true },
      })
    ).map((o) => o.customerEmail.toLowerCase()),
  );

  const bySource = new Map<string, SourceStat & { dayCounts: Map<string, number> }>();
  for (const s of subs) {
    const cur =
      bySource.get(s.source) ??
      ({ source: s.source, last7d: 0, maxDay: 0, totalActive: 0, lifetimeBuyers: 0, dayCounts: new Map() } as any);
    if (s.isSubscribed) cur.totalActive += 1;
    if (buyers.has(s.email.toLowerCase())) cur.lifetimeBuyers += 1;
    if (s.createdAt >= since7) {
      cur.last7d += 1;
      const day = s.createdAt.toISOString().slice(0, 10);
      cur.dayCounts.set(day, (cur.dayCounts.get(day) ?? 0) + 1);
    }
    bySource.set(s.source, cur);
  }
  const stats = [...bySource.values()].map((c) => ({
    source: c.source,
    last7d: c.last7d,
    maxDay: Math.max(0, ...c.dayCounts.values()),
    totalActive: c.totalActive,
    lifetimeBuyers: c.lifetimeBuyers,
  }));
  stats.sort((a, b) => b.last7d - a.last7d);
  return { stats, quarantined };
}

function findAnomalies(stats: SourceStat[]): string[] {
  const out: string[] = [];
  for (const s of stats) {
    if (s.last7d >= ANOMALY_7D_SIGNUPS && s.lifetimeBuyers === 0) {
      out.push(
        `Source "${s.source}": ${s.last7d} signups in 7 days with ZERO lifetime buyers — the footer-bot signature. Check /api/newsletter rejection logs and consider quarantining the segment.`,
      );
    } else if (s.maxDay >= ANOMALY_1D_SIGNUPS) {
      out.push(`Source "${s.source}": ${s.maxDay} signups in a single day — possible burst; watch it.`);
    }
  }
  return out;
}

function digestHtml(stats: SourceStat[], quarantined: number, anomalies: string[]): string {
  const rows = stats
    .map(
      (s) => `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;font-family:monospace;">${s.source}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${s.last7d}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${s.totalActive}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${s.lifetimeBuyers}</td>
      </tr>`,
    )
    .join('');
  const alerts = anomalies.length
    ? `<div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:12px 14px;margin:0 0 16px;">
         <strong>⚠ Anomalies</strong><ul>${anomalies.map((a) => `<li>${a}</li>`).join('')}</ul>
       </div>`
    : `<p style="color:#065F46;"><strong>✓ No anomalies.</strong> Signup patterns look organic.</p>`;
  return `<div style="font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:#1a1a2e;max-width:560px;">
    <h2 style="margin:0 0 12px;">Mailing-list health</h2>
    ${alerts}
    <table style="border-collapse:collapse;width:100%;font-size:13px;">
      <tr>
        <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #1a1a2e;">source</th>
        <th style="text-align:right;padding:6px 10px;border-bottom:2px solid #1a1a2e;">7-day signups</th>
        <th style="text-align:right;padding:6px 10px;border-bottom:2px solid #1a1a2e;">active</th>
        <th style="text-align:right;padding:6px 10px;border-bottom:2px solid #1a1a2e;">lifetime buyers</th>
      </tr>
      ${rows}
    </table>
    <p style="color:#6b7280;font-size:12px;margin-top:14px;">
      ${quarantined} addresses remain quarantined from the Aug-2026 footer list-bombing.
      A healthy source has buyers; a source with volume and none is a bot list.
      Full context: memory of the 2026-08-24 scrub.
    </p>
  </div>`;
}

/** Called by the 15-minute ops cron. Acts only inside 12:00-12:15 UTC. */
export async function maybeRunListHealth(): Promise<{ ran: boolean; sent: boolean; anomalies: number }> {
  const now = new Date();
  const inWindow = now.getUTCHours() === 12 && now.getUTCMinutes() < 15;
  if (!inWindow) return { ran: false, sent: false, anomalies: 0 };

  const isMonday = now.getUTCDay() === 1;
  const { stats, quarantined } = await collectStats();
  const anomalies = findAnomalies(stats);

  // Digest on Mondays; alert any day something trips.
  if (!isMonday && anomalies.length === 0) return { ran: true, sent: false, anomalies: 0 };

  const subject = anomalies.length
    ? `⚠ Mailing-list anomaly — ${anomalies.length} flag${anomalies.length > 1 ? 's' : ''}`
    : 'Mailing-list health — weekly digest';
  const send = await sendEmail({ to: OPS_TO, subject, html: digestHtml(stats, quarantined, anomalies) });
  if (!send.ok) console.error('[list-health] digest send failed', send.error);
  return { ran: true, sent: send.ok, anomalies: anomalies.length };
}
