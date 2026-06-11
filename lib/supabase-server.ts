/**
 * Server-side Supabase client wired to Next.js cookies for session
 * persistence. Use this in:
 *
 *   - Server Components
 *   - Route Handlers (app/api/.../route.ts)
 *   - Server Actions
 *
 * Each call to `createServerSupabase()` reads/writes the current request's
 * cookie jar via next/headers — that's how Supabase Auth knows which user
 * is signed in for THIS request.
 *
 * For middleware (Edge runtime) use lib/supabase-middleware.ts instead.
 * For Client Components use lib/supabase-browser.ts.
 */

import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        // Newer @supabase/ssr cookie interface: getAll + setAll.
        getAll() {
          return cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }));
        },
        setAll(cookiesToSet) {
          // Server Components can't set cookies — this only runs in Route
          // Handlers / Server Actions / Middleware. We try; if Next.js
          // throws because we're in a Server Component context, we
          // swallow the error. The session will still be refreshed on
          // the next mutating request.
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component — cookies are read-only here. OK to ignore.
          }
        },
      },
    },
  );
}
