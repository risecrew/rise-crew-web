import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { getSupabasePublicConfig } from './env';

// A Supabase client that uses the secret key and so skips row-level security. Only server code may
// import this, and only for work that needs it (changing roles, blocking, deleting an account).
// Whoever calls it must already have checked that the signed-in visitor is allowed to do the job.
export function createSupabaseAdminClient() {
  const { url } = getSupabasePublicConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Supabase is not configured: set SUPABASE_SECRET_KEY.');
  }

  return createClient<Database>(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
