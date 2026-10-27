import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import type { Database } from './database.types';
import { getSupabasePublicConfig } from './env';

// Keeps the visitor's session fresh. The proxy calls this once per request with the response it
// is about to return. When the access token has expired, `getClaims()` trades the refresh token
// for a new pair and hands the new cookies to `setAll`; they are put on `response` so the browser
// stores them, together with the no-cache headers Supabase asks for (a cached response carrying
// someone's session cookie could be served to somebody else).
//
// This is the only place the session is refreshed. Pages and actions read it through
// createSupabaseServerClient and decide access in viewer.ts, never from this call.
export async function refreshSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const { url, publishableKey } = getSupabasePublicConfig();

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  try {
    await supabase.auth.getClaims();
  } catch {
    // A Supabase outage must not take the public pages down with it. The visitor simply stays
    // signed out for this request; protected pages check the session again and send them to sign in.
  }

  return response;
}
