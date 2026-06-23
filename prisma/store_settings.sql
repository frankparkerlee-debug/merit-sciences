-- Creates the store_settings table.
-- Apply ONCE in Supabase → SQL Editor (production DB jwjxgujqadftwygwkpbp).
-- Single row (id=1) holds store-wide configuration editable from /admin/settings.

CREATE TABLE "store_settings" (
    "id"                    INTEGER NOT NULL DEFAULT 1,
    "freeShippingThreshold" INTEGER NOT NULL DEFAULT 35000,
    "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);

-- Seed the one permanent row so reads never 404.
INSERT INTO "store_settings" ("id", "freeShippingThreshold", "updatedAt")
VALUES (1, 35000, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
