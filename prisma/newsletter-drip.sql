-- Prospect email drip — schema + "start the timer today" backfill.
-- Run in the Supabase SQL editor (pooler can't migrate). One-time.

-- 1) Drip pointer + timer columns on the subscriber row.
alter table newsletter_subscribers
  add column if not exists "lastSentKey"   text,
  add column if not exists "lastSentAt"    timestamptz,
  add column if not exists "dripStartedAt" timestamptz;

-- 2) Start the clock TODAY for everyone currently on the list, and reset the
--    pointer so the whole backlog enters the 8-email funnel at email 1. This is
--    a one-time kickoff — run it once, right before you arm the cron. (New
--    signups get dripStartedAt set automatically at capture.)
update newsletter_subscribers
   set "dripStartedAt" = now(),
       "lastSentKey"   = null,
       "lastSentAt"    = null
 where "isSubscribed" = true;
