'use client';

import { usePathname } from 'next/navigation';

/**
 * Floating "Chat with us on WhatsApp" button — the soft, conversational entry
 * point. A nervous, self-vetting buyer will DM a human before they cold-
 * checkout, so this opens a WhatsApp thread with a pre-filled opener.
 *
 * IMPORTANT — the CHAT is the entry point, the TRANSACTION is NOT here.
 * WhatsApp (Meta) Commerce Policy prohibits selling regulated goods over
 * WhatsApp catalogs/payments. So this is a support/concierge door only: we
 * answer questions + build trust in chat, then send the buyer to the compliant
 * PayPal checkout on meritsciences.com to actually pay. Never quote a catalog
 * or take payment inside WhatsApp. See docs/whatsapp-playbook.md.
 *
 * Inert until NEXT_PUBLIC_WHATSAPP_NUMBER is set in Render (E.164, e.g.
 * "+15125551234" — non-digits are stripped). Mounted inside <ChromeGate> so it
 * never appears on the clean-room ad LPs (/access, /lp/*); the HIDE_PREFIXES
 * below additionally keep it off transactional/account surfaces.
 */

const RAW_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
const PREFILL = 'Hi Merit — I have a question before I order.';

const HIDE_PREFIXES = ['/checkout', '/admin', '/affiliate', '/practitioners', '/account', '/orders', '/auth'];

export function WhatsAppButton() {
  const pathname = usePathname() || '';
  const digits = RAW_NUMBER.replace(/\D/g, '');

  // Inert until a real number is configured — safe to ship unset.
  if (!digits) return null;
  if (HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) return null;

  const href = `https://wa.me/${digits}?text=${encodeURIComponent(PREFILL)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full bg-[#25D366] py-3 pl-3.5 pr-3.5 sm:pr-5 text-white shadow-[0_12px_34px_-10px_rgba(0,0,0,0.5)] transition hover:brightness-[1.06] active:scale-[0.98]"
    >
      <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.945c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a11.882 11.882 0 005.71 1.447h.006c6.585 0 11.946-5.365 11.949-11.951a11.821 11.821 0 00-3.481-8.4z" />
      </svg>
      <span className="hidden text-[15px] font-bold tracking-tight sm:inline">Chat with us</span>
    </a>
  );
}
