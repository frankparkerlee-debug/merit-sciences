// Two Supabase clients with very different blast radii:
//
//   - `supabasePublic`  — uses the publishable (anon) key. Safe to use
//                          in browser code or any server route. RLS
//                          policies on the database govern what it can
//                          read/write.
//
//   - `supabaseAdmin`   — uses the secret key. BYPASSES RLS. Only ever
//                          import from `server-only` modules. Use it
//                          to create/delete users via auth.admin,
//                          write rows on behalf of any user, etc.
//
// We never want a build to accidentally bundle supabaseAdmin into a
// client component, so this file imports `server-only` to crash the
// build if it's imported by a 'use client' module.

import 'server-only';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !PUBLISHABLE_KEY) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  );
}

export const supabasePublic = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// supabaseAdmin is lazily constructed so importing this module in a
// build context without SUPABASE_SECRET_KEY doesn't blow up — only
// actual use of it does.
let _admin: ReturnType<typeof createClient> | null = null;
export function supabaseAdmin() {
  if (!SECRET_KEY) {
    throw new Error(
      'SUPABASE_SECRET_KEY is required for admin operations but is not set',
    );
  }
  if (!_admin) {
    _admin = createClient(SUPABASE_URL!, SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}
