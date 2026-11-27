/**
 * Shell and parts for Merit's consumer emails (lib/lifecycle-emails.ts):
 * new signup, abandoned cart, post-purchase, and sale campaigns.
 *
 * Every email opens on a piece of composed art (public/brand/email/art-*.jpg):
 * Merit's own imagery with the headline set in Inter Tight, rendered to JPG so
 * it looks the same in Gmail, Apple Mail and Outlook. The alt text carries the
 * headline for readers with images off. Under the art, live text in one of
 * four color registers:
 *
 *   signup  cobalt      cart   orange
 *   order   ink/cream   promo  black with electric blue
 *
 * Table layout and inline styles throughout. No 'server-only' import on
 * purpose: this is pure string building and the preview script loads it in Node.
 */

const SANS = "'Helvetica Neue',Helvetica,Arial,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const MONO = "'SF Mono',Menlo,Consolas,'Courier New',monospace";
const INK = '#0B0F19';

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');

export function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Make a site-relative path absolute so it loads in an inbox. */
export function abs(src: string): string {
  return src.startsWith('http') ? src : `${SITE}${src.startsWith('/') ? '' : '/'}${src}`;
}

export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export type Theme = {
  /** Page behind the sheet. */
  field: string;
  sheet: string;
  /** Headline-weight text. */
  strong: string;
  text: string;
  soft: string;
  line: string;
  /** Quiet panel color for stats and product tiles. */
  tile: string;
  accent: string;
  /** Text set on the accent color. */
  onAccent: string;
  /** Wordmark dot and small highlights. */
  dot: string;
};

const LIGHT = { field: '#ECECE6', sheet: '#FFFFFF', strong: INK, text: '#262B36', soft: '#6A7080', line: '#E6E6E1' };

export const THEMES = {
  signup: { ...LIGHT, tile: '#EEF1FF', accent: '#2443D6', onAccent: '#FFFFFF', dot: '#7C93FF' },
  cart: { ...LIGHT, tile: '#FFF1E6', accent: '#E8590C', onAccent: '#FFFFFF', dot: '#FF9A52' },
  order: { ...LIGHT, tile: '#F3ECDD', accent: INK, onAccent: '#FFFFFF', dot: '#7C93FF' },
  promo: {
    field: '#000000', sheet: '#07080C', strong: '#FFFFFF', text: '#D5D9E4', soft: '#8E94A6', line: '#22252E',
    tile: '#12141B', accent: '#4D6BFF', onAccent: '#FFFFFF', dot: '#5A78FF',
  },
} satisfies Record<string, Theme>;

export type LifecycleShell = {
  theme: Theme;
  subject: string;
  /** Inbox preview line shown after the subject. */
  preheader: string;
  /** Composed art that opens the email. The alt text is the headline.
   *  Account notices leave it out and get a plain wordmark bar instead. */
  art?: { src: string; alt: string; href: string };
  /** Sections built with kit(theme). */
  body: string;
  unsubscribeUrl?: string;
  /** Why the reader is getting this. */
  reason: string;
};

export function wrapLifecycleEmail(s: LifecycleShell): string {
  const t = s.theme;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(s.subject)}</title>
<style>
  @media (max-width:520px){
    .px{padding-left:24px!important;padding-right:24px!important}
    .lede{font-size:22px!important;line-height:30px!important}
    .big{font-size:30px!important;line-height:32px!important}
    .code{font-size:25px!important}
    .pct{font-size:44px!important}
  }
</style></head>
<body style="margin:0;padding:0;background:${t.field};font-family:${SANS};color:${t.text};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${t.field};">${esc(s.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${t.field}" style="background:${t.field};">
    <tr><td align="center" style="padding:24px 10px 36px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="${t.sheet}" style="width:100%;max-width:600px;background:${t.sheet};border-radius:14px;overflow:hidden;">
        ${
          s.art
            ? `<tr><td bgcolor="${INK}" style="background:${INK};font-size:0;line-height:0;">
          <a href="${esc(s.art.href)}"><img src="${abs(s.art.src)}" alt="${esc(s.art.alt)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;font-family:${SANS};font-size:28px;line-height:34px;font-weight:700;color:#ffffff;" /></a>
        </td></tr>`
            : `<tr><td class="px" bgcolor="${INK}" style="background:${INK};padding:22px 40px;font-family:${SANS};font-size:24px;line-height:26px;font-weight:700;letter-spacing:-0.03em;"><a href="${SITE}" style="color:#ffffff;text-decoration:none;">Merit<span style="color:${t.dot};">.</span></a></td></tr>`
        }
        ${s.body}
        <tr><td class="px" bgcolor="${INK}" style="background:${INK};padding:30px 40px 32px;">
          <p style="margin:0 0 14px;font-family:${SANS};font-size:24px;line-height:26px;font-weight:700;letter-spacing:-0.03em;"><a href="${SITE}" style="color:#ffffff;text-decoration:none;">Merit<span style="color:${t.dot};">.</span></a></p>
          <p style="margin:0 0 4px;font-size:13px;line-height:20px;color:#B4BACB;">Merit Sciences</p>
          <p style="margin:0;font-size:13px;line-height:20px;color:#8E94A6;">Reply to this email and a person will answer.${
            s.unsubscribeUrl ? ` <a href="${esc(s.unsubscribeUrl)}" style="color:#8E94A6;text-decoration:underline;">Unsubscribe</a>` : ''
          }</p>
          <p style="margin:12px 0 0;font-size:11px;line-height:17px;color:#6E7486;">For research use only. Not for human or veterinary use.</p>
        </td></tr>
      </table>
      <p style="max-width:600px;margin:14px auto 0;font-family:${SANS};font-size:11px;line-height:17px;color:#8A8F9C;text-align:center;">${esc(s.reason)}</p>
    </td></tr>
  </table>
</body></html>`;
}

export type ItemRow = { title: string; meta?: string; price?: string; imageUrl?: string | null; href?: string };
export type Card = { title: string; price: string; was?: string; imageUrl?: string | null; href: string };

/** The parts of an email body, colored for one theme. */
export function kit(t: Theme) {
  /** A padded band of the sheet. Everything in a body sits inside one. */
  const sec = (html: string, bg: string = t.sheet, pad = '42px 40px 40px') =>
    `<tr><td class="px" bgcolor="${bg}" style="background:${bg};padding:${pad};">${html}</td></tr>`;

  /** The opening sentence, set large. */
  const lede = (html: string) =>
    `<p class="lede" style="margin:0 0 20px;font-family:${SANS};font-size:26px;line-height:35px;font-weight:700;letter-spacing:-0.012em;color:${t.strong};">${html}</p>`;

  const p = (html: string) => `<p style="margin:0 0 20px;font-size:16px;line-height:27px;color:${t.text};">${html}</p>`;

  const small = (html: string) => `<p style="margin:20px 0 0;font-size:13px;line-height:21px;color:${t.soft};">${html}</p>`;

  const link = (label: string, href: string) =>
    `<a href="${esc(href)}" style="color:${t.accent === INK ? '#2443D6' : t.accent};font-weight:600;text-decoration:underline;">${label}</a>`;

  /** Full-width button in the theme's color. */
  const button = (label: string, href: string) =>
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 2px;"><tr><td align="center" bgcolor="${t.accent}" style="background:${t.accent};border-radius:10px;">
      <a href="${esc(href)}" style="display:block;padding:18px 24px;font-family:${SANS};font-size:17px;line-height:22px;font-weight:700;letter-spacing:-0.01em;color:${t.onAccent};text-decoration:none;border-radius:10px;">${label} &rarr;</a>
    </td></tr></table>`;

  /** The discount code as a coupon: code on the left, the number on the right. */
  const coupon = (code: string, pct: number, caption: string) =>
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${t.accent}" style="margin:8px 0 6px;background:${t.accent};border-radius:12px;"><tr>
      <td style="padding:26px 0 26px 28px;">
        <div style="font-size:11px;line-height:16px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${t.onAccent};opacity:0.75;">Your code</div>
        <div class="code" style="margin-top:6px;font-family:${MONO};font-size:30px;line-height:34px;font-weight:700;letter-spacing:0.06em;color:${t.onAccent};">${esc(code)}</div>
        <div style="margin-top:10px;font-size:14px;line-height:21px;color:${t.onAccent};opacity:0.85;">${caption}</div>
      </td>
      <td width="1" style="border-left:2px dashed ${t.onAccent};opacity:0.4;font-size:0;">&nbsp;</td>
      <td align="center" width="34%" style="padding:26px 12px;">
        <div class="pct" style="font-family:${SANS};font-size:54px;line-height:58px;font-weight:800;letter-spacing:-0.03em;color:${t.onAccent};">${pct}%</div>
        <div style="font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${t.onAccent};opacity:0.75;">off</div>
      </td>
    </tr></table>`;

  /** Up to three big figures side by side, each with a line under it. */
  const stats = (list: [string, string][]) => {
    const w = Math.floor(100 / list.length);
    const cells = list
      .map(
        ([n, label], i) => `<td valign="top" width="${w}%" style="padding:0 ${i === list.length - 1 ? 0 : 12}px 0 0;">
        <div class="big" style="font-family:${SANS};font-size:34px;line-height:40px;font-weight:800;letter-spacing:-0.025em;color:${t.strong};">${n}</div>
        <div style="margin-top:8px;font-size:14px;line-height:21px;color:${t.soft};">${label}</div>
      </td>`,
      )
      .join('');
    return sec(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>${cells}</tr></table>`, t.tile, '30px 40px 30px');
  };

  /** Numbered steps, for things that really happen in order. */
  const steps = (list: [string, string][]) =>
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:10px 0 0;">${list
      .map(
        ([head, body], i) => `<tr>
      <td valign="top" width="58" style="padding:20px 0;border-top:1px solid ${t.line};font-family:${SANS};font-size:34px;line-height:38px;font-weight:800;letter-spacing:-0.03em;color:${t.accent === INK ? '#2443D6' : t.accent};">${i + 1}</td>
      <td valign="top" style="padding:20px 0;border-top:1px solid ${t.line};">
        <div style="font-size:18px;line-height:24px;font-weight:700;letter-spacing:-0.01em;color:${t.strong};">${head}</div>
        <div style="margin-top:6px;font-size:15px;line-height:24px;color:${t.text};">${body}</div>
      </td></tr>`,
      )
      .join('')}</table>`;

  /** Question on top in bold, answer under it. */
  const qa = (list: [string, string][]) =>
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:6px 0 0;">${list
      .map(
        ([q, a]) => `<tr><td style="padding:20px 0;border-top:1px solid ${t.line};">
        <div style="font-size:18px;line-height:24px;font-weight:700;letter-spacing:-0.01em;color:${t.strong};">${q}</div>
        <div style="margin-top:6px;font-size:15px;line-height:24px;color:${t.text};">${a}</div>
      </td></tr>`,
      )
      .join('')}</table>`;

  /** Line items: thumbnail, title, a quiet second line, price on the right. */
  const items = (list: ItemRow[], total?: { label: string; value: string }) => {
    const body = list
      .map((i) => {
        const img = i.imageUrl
          ? `<img src="${abs(i.imageUrl)}" alt="" width="72" height="72" style="display:block;width:72px;height:72px;border:0;border-radius:10px;background:${t.tile};" />`
          : `<div style="width:72px;height:72px;border-radius:10px;background:${t.tile};"></div>`;
        return `<tr>
        <td width="72" valign="top" style="padding:12px 0;border-top:1px solid ${t.line};">${img}</td>
        <td valign="middle" style="padding:12px 16px;border-top:1px solid ${t.line};">
          <div style="font-size:17px;line-height:22px;font-weight:700;letter-spacing:-0.01em;color:${t.strong};">${esc(i.title)}</div>
          ${i.meta ? `<div style="margin-top:2px;font-size:13px;line-height:19px;color:${t.soft};">${esc(i.meta)}</div>` : ''}
        </td>
        <td valign="middle" align="right" style="padding:12px 0;border-top:1px solid ${t.line};font-size:16px;line-height:21px;font-weight:600;color:${t.strong};white-space:nowrap;">${i.price ? esc(i.price) : ''}</td>
      </tr>`;
      })
      .join('');
    const foot = total
      ? `<tr>
        <td colspan="2" style="padding:16px 0 0;border-top:2px solid ${t.strong};font-size:13px;line-height:21px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${t.soft};">${esc(total.label)}</td>
        <td align="right" style="padding:16px 0 0;border-top:2px solid ${t.strong};font-family:${SANS};font-size:24px;line-height:26px;font-weight:800;letter-spacing:-0.03em;color:${t.strong};white-space:nowrap;">${esc(total.value)}</td>
      </tr>`
      : '';
    return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:14px 0 4px;">${body}${foot}</table>`;
  };

  /** Product cards, two to a row. `was` strikes the old price beside the new one. */
  const cards = (list: Card[]) => {
    const cell = (c: Card | undefined, left: boolean) =>
      c
        ? `<td valign="top" width="50%" style="padding:0 ${left ? 8 : 0}px 16px ${left ? 0 : 8}px;">
        <a href="${esc(c.href)}" style="text-decoration:none;">
          ${
            c.imageUrl
              ? `<img src="${abs(c.imageUrl)}" alt="${esc(c.title)}" width="252" style="display:block;width:100%;height:auto;border:0;border-radius:12px;background:${t.tile};" />`
              : `<div style="height:200px;border-radius:12px;background:${t.tile};"></div>`
          }
          <div style="margin-top:10px;font-size:17px;line-height:22px;font-weight:700;letter-spacing:-0.01em;color:${t.strong};">${esc(c.title)}</div>
          <div style="margin-top:2px;font-size:15px;line-height:21px;color:${t.text};">${
            c.was ? `<span style="color:${t.soft};text-decoration:line-through;">${esc(c.was)}</span>&nbsp; <span style="font-weight:700;color:${t.accent};">${esc(c.price)}</span>` : esc(c.price)
          }</div>
        </a>
      </td>`
        : `<td width="50%"></td>`;
    const out: string[] = [];
    for (let i = 0; i < list.length; i += 2) out.push(`<tr>${cell(list[i], true)}${cell(list[i + 1], false)}</tr>`);
    return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 0;">${out.join('')}</table>`;
  };

  return { sec, lede, p, small, link, button, coupon, stats, steps, qa, items, cards };
}
