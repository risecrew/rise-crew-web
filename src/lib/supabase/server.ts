import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './database.types';
import { getSupabasePublicConfig } from './env';

// A Supabase client that acts as the signed-in visitor, for Server Components, route handlers and
// server actions. Create one per request; never keep it in a module-level variable.
//
// It only reads the session. The proxy is what refreshes an expiring token and writes the new
// cookies (see proxy.ts), because a Server Component cannot set cookies.
export async function createSupabaseServerClient() {
  const { url, publishableKey } = getSupabasePublicConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy refreshes the
          // session on every request, so the new cookies reach the browser from there instead.
        }
      },
    },
  });
}
