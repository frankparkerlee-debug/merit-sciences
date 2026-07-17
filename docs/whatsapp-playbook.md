# WhatsApp concierge playbook

WhatsApp is Merit's **soft entry point** — a hesitant, self-vetting buyer will DM a
human before they cold-checkout. The chat builds trust; the **transaction still
happens on the compliant PayPal checkout** at meritsciences.com.

> **The one rule:** the chat is the front door, not the register. Never quote a
> catalog, take payment, or run a "WhatsApp Business catalog/payment" inside the
> app. WhatsApp is owned by Meta and its Commerce Policy prohibits selling
> regulated goods — doing so gets the number banned. Answer → build trust → send
> a checkout link. That's the whole motion.

---

## Setup (one-time, ~20 min) — Parker's steps

1. **Get a dedicated number.** Don't use your personal cell. Options: a second
   SIM, a Google Voice number, or a Twilio number. This becomes the public Merit
   support line.
2. **Install WhatsApp Business** (free app, iOS/Android) and register that number.
   Set the business name to **Merit Sciences**, category *Health / Beauty* is fine,
   add the logo, hours (CT), and website `meritsciences.com`.
3. **Load the greeting / away messages and quick replies** below (Business app →
   *Settings → Business tools*).
4. **Turn on the site button:** in Render → the `merit-render` service → Environment,
   add `NEXT_PUBLIC_WHATSAPP_NUMBER` = your number in E.164 (e.g. `+15125551234`),
   then **Deploy latest commit**. The floating "Chat with us" button is already in
   the code and stays invisible until this var is set.

That's it — the button goes live and links straight into your WhatsApp with a
pre-filled opener.

---

## Auto-messages

**Greeting (first message from a new contact):**
> Hey — thanks for reaching out to Merit 👋 Ask me anything: sourcing, testing,
> shipping, or how to order. A real person replies during business hours (CT).

**Away message (outside hours):**
> Thanks for messaging Merit! We're away right now but reply every morning (CT).
> In the meantime you can verify any batch's lab report at
> meritsciences.com/coa, and order anytime at meritsciences.com.

---

## Quick replies (canned answers — the `/shortcut` is what you type)

**`/order` — How do I order?**
> Easy. Tell me what you're looking for and I'll send you a secure checkout link,
> or you can order anytime at meritsciences.com. Ships from Dallas within 48h,
> tracked.

**`/legit` — Is it legit / how do I know?**
> Fair question — we built the whole brand around proving it. Every batch is
> third-party tested. Scan the QR on any label or box, or browse the full report
> library at meritsciences.com/coa. American-made, sealed, and tracked to your door.

**`/coa` — Purity / testing / COA**
> Every lot ships with a QR on the label and box that pulls its Certificate of
> Analysis — identity + purity by HPLC. See the library here: meritsciences.com/coa

**`/ship` — Shipping**
> Ships from Dallas, 48-hour dispatch, fully tracked. Free over $300.

**`/pay` — Payment**
> Secure checkout by card or PayPal — I'll drop you a link, or use
> meritsciences.com. (We never take payment here in chat.)

**`/save` — First order / discount**
> First order? Use code **WELCOME10** for 10% off at checkout. Want me to send the
> link?

---

## The close (how a chat becomes a sale)

1. **Answer the real question.** Sourcing, testing, "is this safe to order" — be a
   human, not a brochure. Trust is the product here.
2. **Point to proof, not hype.** The COA library + QR-on-every-label is the whole
   differentiator — lead with it whenever they're unsure.
3. **Send the checkout link.** Direct them to `meritsciences.com` (or a specific
   product URL). The order completes in the normal PayPal flow — attribution,
   emails, ShipStation all fire as usual.
4. **Never** collect card details, PayPal logins, or off-platform payment (Zelle /
   crypto / "friends & family") in chat. That's the gray-market playbook — it
   risks the number *and* contradicts Merit's "the legit source" positioning.

---

## Feeding the channel (getting people INTO the chat)

- **The site button** (already built) — every store page, bottom-right.
- **Order + shipping emails** — add a "Questions? Chat with us on WhatsApp" line.
- **Click-to-WhatsApp ads (the real unlock).** On Meta, an ad whose button opens a
  chat ("Questions about sourcing? Message us.") clears review far more often than
  a "buy peptides" product ad, because the destination is a conversation, not a
  catalog. Keep the creative category-light: **no molecule names, no health/results
  claims** — same rules as every other paid surface. Note: these run through the
  same Meta ad account that's currently under a security re-auth hold, so that has
  to clear first.

---

## Guardrails (non-negotiable)

- Transaction goes through **meritsciences.com PayPal checkout** — never WhatsApp
  payments or catalog.
- **No molecule names / no health claims** in the ad creative or the chat opener.
- RUO framing holds everywhere: research-use language, no dosing/administration
  advice.
- No off-platform payment, ever.
