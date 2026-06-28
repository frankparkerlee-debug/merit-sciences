# Peptide Tycoon — product-specific discount rewards

The `/game` idle game unlocks real discount codes for the compounds its heroes
parody. Leveling a hero unlocks tiers: **Lv 5 → 5%**, **Lv 15 → 10%**,
**Lv 30 → 15%** off that hero's real product. Codes follow `${PREFIX}${pct}`,
e.g. `RETA10` → 10% off Retatrutide.

## How it works

- A new nullable column **`Discount.productHandle`** scopes a code to one
  product. When set, the `%` applies **only to that product's line subtotal**,
  and the code is rejected unless that product is in the cart. `null` (every
  pre-existing code) = order-wide, unchanged.
- Enforced in `lib/discount.ts` (`validateDiscountCode`), which now also takes
  `lineSubtotalsByHandle`. Both callers pass it: the PayPal `create-order`
  route and the admin manual-order action.
- Game codes are **`oncePerCustomer`** so a leaked code can't be farmed.

## ⚠️ Deploy sequence (order matters — get it wrong and checkout breaks)

`prisma.discount.findUnique` selects all columns, so the code must NOT ship
before the DB column exists, or discount validation throws for *every* code.
The build runs `prisma generate` but **not** `db push`, so apply the schema
manually first:

1. **Add the column to prod** (safe, non-destructive — nullable):
   ```bash
   npm run db:push
   ```
2. **Deploy the code** (merge this branch → `main`).
3. **Seed the game codes** against prod:
   ```bash
   node scripts/seed-game-discounts.mjs
   ```
   Idempotent — re-run any time. Creates 48 codes (16 heroes × 3 tiers).

Steps 1 and 3 need a `DATABASE_URL` pointing at prod in the environment.

## Tuning

- Discount tiers live in `lib/game/characters.ts` (`REWARD_TIERS`) and are
  mirrored in `scripts/seed-game-discounts.mjs` (`TIERS`). Keep them in sync.
- To pause a code, set its `status` to `DISABLED` in `/admin/discounts` (or
  delete the row). The game UI still shows it, but checkout will reject it.
- Add usage caps (`maxUses`) or an expiry (`endsAt`) per code from the admin if
  you want tighter control beyond once-per-customer.
