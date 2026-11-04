import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';
import { getSupabasePublicConfig } from './env';

// The Supabase client for Client Components (the sign-in form, sign-out). In the browser it is a
// single shared instance, and it keeps the session in the same cookies the server reads.
export function createSupabaseBrowserClient() {
  const { url, publishableKey } = getSupabasePublicConfig();
  return createBrowserClient<Database>(url, publishableKey);
}
