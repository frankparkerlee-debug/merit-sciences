-- Per-practice pricing — book-level multiplier + per-SKU overrides.
-- Paste into Supabase Dashboard → SQL Editor → New query → Run.
-- Idempotent: safe to re-run.

-- ── Knob 1: book-level multiplier on each approved practitioner ──────
-- Basis points. 10000 = no change (standard physician tier).
-- 9500 = 5% below standard. 10800 = 8% above standard.
ALTER TABLE "practitioner_applications"
  ADD COLUMN IF NOT EXISTS "priceMultiplierBps" INT NOT NULL DEFAULT 10000;

-- ── Knob 2: per-SKU price pins per approved practitioner ─────────────
-- Overrides both Product.physicianPriceCents and the practitioner's
-- book-level multiplier for that specific SKU.
CREATE TABLE IF NOT EXISTS "practitioner_price_overrides" (
  "id"             TEXT PRIMARY KEY,
  "applicationId"  TEXT NOT NULL,
  "productHandle"  TEXT NOT NULL,
  "priceCents"     INT  NOT NULL,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "practitioner_price_overrides_application_fk"
    FOREIGN KEY ("applicationId")
    REFERENCES "practitioner_applications" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "practitioner_price_overrides_product_fk"
    FOREIGN KEY ("productHandle")
    REFERENCES "products" ("handle")
    ON DELETE CASCADE,
  CONSTRAINT "practitioner_price_overrides_unique"
    UNIQUE ("applicationId", "productHandle")
);

CREATE INDEX IF NOT EXISTS "practitioner_price_overrides_applicationId_idx"
  ON "practitioner_price_overrides" ("applicationId");
