import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { getSupabasePublicConfig } from './env';

// A Supabase client with no session, for what anyone may read. It never touches cookies, so a page
// that uses it can still be served from the cache.
export function createSupabasePublicClient() {
  const { url, publishableKey } = getSupabasePublicConfig();
  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
