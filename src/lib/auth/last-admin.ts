import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { leavesNoAdmin } from './members';

// The site must never be left without an admin who can sign in: admins are the only ones who can
// make another admin, so a site with none needs a hand-fix in the database. Everything that could
// take an admin away (changing a role, blocking, deleting an account) asks here first.

// Every admin who is not blocked. Read with the secret key, so that it counts everyone whatever
// the signed-in person is allowed to see.
export async function unblockedAdminIds(): Promise<string[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin')
    .is('blocked_at', null);
  if (error) throw new Error(error.message);
  return data.map((row) => row.user_id);
}

// Whether the people in `losing` stopping being admins who can sign in (demoted, blocked or
// deleted) would leave the site with none. Throws when the database cannot be read; the caller
// must then refuse rather than assume the answer is no.
export async function wouldLeaveNoAdmin(losing: readonly string[]): Promise<boolean> {
  return leavesNoAdmin(await unblockedAdminIds(), losing);
}
