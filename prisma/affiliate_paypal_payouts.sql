-- Affiliate PayPal payouts — destination email + payout item ids.
-- Paste into Supabase Dashboard → SQL Editor → New query → Run.
-- Idempotent: safe to re-run.

ALTER TABLE "affiliates"
  ADD COLUMN IF NOT EXISTS "paypalEmail" TEXT;

ALTER TABLE "payouts"
  ADD COLUMN IF NOT EXISTS "paypalBatchId" TEXT,
  ADD COLUMN IF NOT EXISTS "paypalItemId"  TEXT;

-- Unique guards (skip silently if they already exist)
DO $$ BEGIN
  ALTER TABLE "payouts" ADD CONSTRAINT "payouts_paypalBatchId_key" UNIQUE ("paypalBatchId");
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "payouts" ADD CONSTRAINT "payouts_paypalItemId_key" UNIQUE ("paypalItemId");
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
