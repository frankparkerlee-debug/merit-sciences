-- Practitioner Program applications.
-- Paste into Supabase Dashboard → SQL Editor → New query → Run.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS "practitioner_applications" (
  "id"             TEXT PRIMARY KEY,
  "practiceName"   TEXT NOT NULL,
  "providerName"   TEXT NOT NULL,
  "credentials"    TEXT NOT NULL,
  "state"          TEXT NOT NULL,
  "licenseNumber"  TEXT NOT NULL,
  "npi"            TEXT NOT NULL,
  "email"          TEXT NOT NULL,
  "phone"          TEXT,
  "specialty"      TEXT,
  "monthlyVolume"  TEXT,
  "notes"          TEXT,
  "status"         TEXT NOT NULL DEFAULT 'PENDING',
  "reviewedAt"     TIMESTAMPTZ,
  "reviewerEmail"  TEXT,
  "reviewerNote"   TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "practitioner_applications_status_idx"
  ON "practitioner_applications" ("status");
CREATE INDEX IF NOT EXISTS "practitioner_applications_createdAt_idx"
  ON "practitioner_applications" ("createdAt");
