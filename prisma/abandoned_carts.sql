-- Creates the abandoned_carts table + status enum.
-- Apply ONCE in Supabase → SQL Editor (production DB jwjxgujqadftwygwkpbp).
-- This is the exact DDL Prisma generates for the AbandonedCart model, so the
-- generated client matches the table 1:1. Additive only — touches nothing else.

CREATE TYPE "abandoned_cart_status" AS ENUM ('OPEN', 'RECOVERED', 'DISMISSED');

CREATE TABLE "abandoned_carts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "lines" JSONB NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "referralCode" TEXT,
    "referralSlug" TEXT,
    "source" TEXT NOT NULL DEFAULT 'checkout',
    "status" "abandoned_cart_status" NOT NULL DEFAULT 'OPEN',
    "recoveredAt" TIMESTAMP(3),
    "emailCount" INTEGER NOT NULL DEFAULT 0,
    "lastEmailedAt" TIMESTAMP(3),
    "recoverToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abandoned_carts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "abandoned_carts_email_key" ON "abandoned_carts"("email");
CREATE UNIQUE INDEX "abandoned_carts_recoverToken_key" ON "abandoned_carts"("recoverToken");
CREATE INDEX "abandoned_carts_status_updatedAt_idx" ON "abandoned_carts"("status", "updatedAt");
