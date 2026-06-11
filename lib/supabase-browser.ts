/**
 * Browser-side Supabase client. Use this in Client Components
 * ('use client') for things like calling supabase.auth.signInWithOtp().
 *
 * Memoized at module level so we don't create a new client on every
 * render — that would defeat session persistence.
 */

'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  if (_client) return _client;
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  return _client;
}
