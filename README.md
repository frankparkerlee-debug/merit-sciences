# Merit Render — standalone storefront

A Next.js 14 storefront mirroring Merit's design language. Replacement target for
the Shopify storefront where the suspended SKUs (LY3298176 Tirzepatide,
LY3437943 Retatrutide, TH9507 Tesamorelin, Semaglutide) can be listed without
platform AUP enforcement.

## Local development

```bash
cd "/Users/parkerlee/Desktop/merit-render"
npm install
npm run dev
```

Open http://localhost:3000

## Stack

- **Next.js 14** App Router + React 18 + TypeScript
- **Tailwind CSS** with Merit brand tokens (cobalt #2E4DDB · cream #F4F1EA · steel ink #0B0F19)
- **Zustand** + localStorage for the cart
- **JSON catalog** in `content/products/*.json` — every product version-controlled, no Shopify dependency

## What's working in this scaffold

- Homepage with hero + featured catalog
- Catalog page listing every product in `content/products/`
- Product detail page (`/products/[handle]`) with the v2 buy-first PDP architecture:
  bundle picker, companion-kit checkbox, MedSource trust line, spec block, FAQ
- Cart with persistent state across page loads
- Checkout API placeholder at `/api/checkout`
- 3 sample products seeded — including LY3298176 Tirzepatide flagged with "Render-only listing" so the catalog grid visibly shows where the Shopify-suspended SKUs go

## What's NOT working yet

- Real payment processing (Stripe + PayPal env vars defined, integration not wired)
- Real product imagery (CSS gradient placeholders)
- Customer accounts / login
- Order management (writes go nowhere)
- Email notifications (no Klaviyo/Postmark integration yet)

## Add a product

Drop a new JSON file in `content/products/<handle>.json` following the shape in
`lib/catalog.ts` (`type Product`). The catalog and routes pick it up automatically
on the next request (`next dev`) or rebuild (`npm run build`).

## Deploying to Render

1. Push this directory to a Git repo (GitHub / GitLab / Bitbucket)
2. In Render dashboard: New → Web Service → connect the repo
3. Render auto-detects the `render.yaml` and offers the configured service
4. Set the env vars (Stripe + PayPal keys) in the dashboard — these are `sync: false`
   in render.yaml so they're not committed to source
5. Deploy. Render builds with `npm install && npm run build` and starts with `npm run start`

## Payment processor integration plan

1. **Stripe** — `/api/checkout` creates a Checkout Session via `stripe.checkout.sessions.create({...})`,
   returns the session URL, browser redirects. Webhook at `/api/webhooks/stripe` handles fulfillment.
2. **PayPal** — Orders v2 API: `/api/checkout` creates an order, returns the approval URL.
   Webhook at `/api/webhooks/paypal` handles fulfillment.
3. Cart routes to Stripe by default; PayPal button on the cart page as alternative path.

## Migrating the full Shopify catalog

The 23 SKUs currently on Merit's Shopify can be exported to JSON via the Shopify
Admin GraphQL API. Reuse the `shopify-auth.js` helper from the existing project to
pull `descriptionHtml`, `variants`, `metafields` and emit them as
`content/products/<handle>.json`. Roughly 1 day of script work + manual cleanup.

## File map

```
app/
  layout.tsx              # Root layout with topbar + nav + footer
  page.tsx                # Homepage
  catalog/page.tsx        # All products grid
  products/[handle]/      # PDP route
  cart/page.tsx           # Cart
  api/checkout/route.ts   # Checkout placeholder
components/
  Nav.tsx · Footer.tsx · BuyBox.tsx
lib/
  catalog.ts              # JSON catalog read
  cart.ts                 # Zustand + localStorage cart
content/products/
  *.json                  # Per-product catalog data
tailwind.config.ts        # Merit design tokens
render.yaml               # Render deploy config
```
