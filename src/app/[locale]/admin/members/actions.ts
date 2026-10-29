'use server';

import { refresh } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { asLocale } from '@/i18n/as-locale';
import type { Locale } from '@/i18n/locales';
import { isAuthEnabled } from '@/lib/auth/config';
import { unblockedAdminIds } from '@/lib/auth/last-admin';
import {
  cleanIds,
  groupRefusals,
  isRole,
  needsConfirmation,
  planBlock,
  planRoleChange,
  readMemberForm,
  refusalReason,
  type MemberAsk,
  type MemberChange,
  type MemberFailure,
  type MemberResult,
  type MemberState,
  type MemberTarget,
} from '@/lib/auth/members';
import { displayName } from '@/lib/auth/name';
import { ROLE_ORDER, atLeast, canBlock, canChangeRole, type AppRole } from '@/lib/auth/roles';
import { getViewer, requireRole } from '@/lib/auth/viewer';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// A blocked account is banned in Auth for a hundred years; unblocking lifts the ban.
const BAN_FOREVER = '876000h';
const BAN_NONE = 'none';

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

function failure(
  error: MemberFailure['error'],
  change: MemberChange | null,
  extra: Partial<Pick<MemberFailure, 'groups' | 'ids'>> = {},
): MemberFailure {
  return { ok: false, at: Date.now(), error, change, groups: [], ids: [], ...extra };
}

// The change would be allowed, and is not done yet: the page asks the person to say yes again.
function ask(change: MemberChange, ids: string[]): MemberAsk {
  return { ok: false, at: Date.now(), error: 'confirm', change, ids };
}

// Puts a ban on each account, or lifts it, ten at a time. Whether every one of them went through.
// What is logged is what Auth said, never who the account is.
async function setBans(admin: AdminClient, ids: readonly string[], duration: string) {
  let allWent = true;
  for (let start = 0; start < ids.length; start += 10) {
    const results = await Promise.all(
      ids
        .slice(start, start + 10)
        .map((id) => admin.auth.admin.updateUserById(id, { ban_duration: duration })),
    );
    for (const { error } of results) {
      if (!error) continue;
      allWent = false;
      console.error('Could not change an account ban:', error.code ?? 'unknown', error.message);
    }
  }
  return allWent;
}

// Does a batch of changes for the signed-in operator or admin. Nothing in it is taken on trust from
// the page:
//  - who is asking is read again (a visitor who was signed out, blocked or demoted since the page
//    opened is refused, and below operator is a 404 like the page itself);
//  - the people are loaded from the database with their roles as they are now, not as the list
//    showed them;
//  - the whole batch is refused if anyone in it may not be changed by this person, naming them
//    with the reason for each, or if it would leave the site without an admin who can sign in;
//  - a change that shuts someone out or hands over the keys (needsConfirmation) is only done when
//    the form says it was confirmed. That is for the person's sake, not a security check: it is
//    asked after everything above, so nobody is asked to confirm what would be refused, and the
//    rules above do not depend on it;
//  - the writes use the secret key, because the signed-in role has no right to write roles, and
//    they only touch rows that are still in a state the person was allowed to change.
//
// The answer is a value for the form to show. A batch that went through also refreshes the list
// the page is showing.
async function applyChange(
  localeArg: Locale,
  userIds: unknown,
  change: MemberChange | null,
  confirmed = true,
): Promise<MemberResult> {
  // Accounts switched off: there is no members screen, as there is no page for it.
  if (!isAuthEnabled()) notFound();
  const locale = asLocale(localeArg);

  // getViewer throws when the database cannot be read. Asked here first, so that requireRole below
  // (which asks again, and gets the same answer within this request) only has to turn a
  // signed-out, unfinished, blocked or too-low account into the right redirect or 404.
  try {
    await getViewer();
  } catch {
    return failure('failed', change);
  }
  const actor = await requireRole(locale, 'operator', `/${locale}/admin/members`);

  if (!Array.isArray(userIds)) return failure('failed', change);
  if (userIds.length === 0) return failure('none', change);
  const ids = cleanIds(userIds);
  if (
    !ids ||
    change === null ||
    !(change.kind === 'role' ? isRole(change.to) : typeof change.blocked === 'boolean')
  ) {
    return failure('failed', change);
  }

  let stepsDown = false;
  let count = 0;
  try {
    const admin = createSupabaseAdminClient();
    const [roleResult, profileResult, adminIds] = await Promise.all([
      admin.from('user_roles').select('user_id, role, blocked_at').in('user_id', ids),
      // Finished sign-ups only, as the list shows them: an account that never finished agreed to
      // nothing and is not the staff's to change (the secret key would read it, so it is left out
      // here and counts as not there).
      admin
        .from('profiles')
        .select('id, last_name, first_name')
        .in('id', ids)
        .not('onboarded_at', 'is', null),
      unblockedAdminIds(),
    ]);
    if (roleResult.error) throw new Error(roleResult.error.message);
    if (profileResult.error) throw new Error(profileResult.error.message);

    // In the order they were chosen.
    const rows = new Map(roleResult.data.map((row) => [row.user_id, row]));
    const profiles = new Map(profileResult.data.map((row) => [row.id, row]));
    if (rows.size !== ids.length || profiles.size !== ids.length) {
      return failure('missing', change, { ids });
    }
    const targets: MemberTarget[] = ids.map((id) => ({
      id,
      role: rows.get(id)!.role,
      blocked: rows.get(id)!.blocked_at !== null,
    }));

    const plan =
      change.kind === 'role'
        ? planRoleChange(actor, targets, change.to, adminIds)
        : planBlock(actor, targets, change.blocked, adminIds);
    if (!plan.ok) {
      if (plan.error === 'lastAdmin') return failure('lastAdmin', change, { ids });
      const refusals = plan.refused.map((id) => {
        const profile = profiles.get(id)!;
        return {
          reason: refusalReason(
            actor,
            targets.find((t) => t.id === id)!,
            change,
          ),
          // A finished sign-up always has both names (the database checks it).
          name: displayName(profile, locale),
        };
      });
      return failure('refused', change, { ids, groups: groupRefusals(refusals) });
    }
    if (!confirmed && needsConfirmation(change)) return ask(change, ids);

    const stamp = { updated_by: actor.id };
    let complete = true;

    if (change.kind === 'role') {
      // Only rows still holding a role this person may change are written, so someone promoted by
      // an admin a moment ago is not overwritten by an operator's stale list.
      const from = ROLE_ORDER.filter((role) => canChangeRole(actor.role, role, change.to));
      const { data, error } = await admin
        .from('user_roles')
        .update({ role: change.to, ...stamp })
        .in('user_id', ids)
        .in('role', from)
        .select('user_id');
      if (error) throw new Error(error.message);
      complete = data.length === ids.length;
    } else if (change.blocked) {
      // The site's own record first (it is what shuts the account out at once), then Auth, so a
      // failure in between leaves the account blocked rather than free.
      const fresh = targets.filter((t) => !t.blocked).map((t) => t.id);
      const flagged = new Set(targets.filter((t) => t.blocked).map((t) => t.id));
      if (fresh.length > 0) {
        const blockable = ROLE_ORDER.filter((role) => canBlock(actor.role, role, false));
        const { data, error } = await admin
          .from('user_roles')
          .update({ blocked_at: new Date().toISOString(), ...stamp })
          .in('user_id', fresh)
          .in('role', blockable)
          .is('blocked_at', null)
          .select('user_id');
        if (error) throw new Error(error.message);
        for (const row of data) flagged.add(row.user_id);
        complete = data.length === fresh.length;
      }
      if (!(await setBans(admin, [...flagged], BAN_FOREVER))) {
        refresh();
        return failure('failed', change, { ids });
      }
    } else {
      // Unblocking goes the other way round: Auth first, so a failure in between leaves the
      // account blocked rather than half let in.
      if (!(await setBans(admin, ids, BAN_NONE))) {
        refresh();
        return failure('failed', change, { ids });
      }
      const flagged = targets.filter((t) => t.blocked).map((t) => t.id);
      if (flagged.length > 0) {
        const unblockable = ROLE_ORDER.filter((role) => canBlock(actor.role, role, false));
        const { data, error } = await admin
          .from('user_roles')
          .update({ blocked_at: null, ...stamp })
          .in('user_id', flagged)
          .in('role', unblockable)
          .not('blocked_at', 'is', null)
          .select('user_id');
        if (error) throw new Error(error.message);
        complete = data.length === flagged.length;
      }
    }

    // An admin who has just stepped down below operator has no members screen any more: the page
    // they are looking at would turn into a 404 under them, so they are taken to My page instead,
    // where their new role is on show. (Done after the try block, because redirect() works by
    // throwing.)
    stepsDown =
      complete &&
      change.kind === 'role' &&
      ids.includes(actor.id) &&
      !atLeast(change.to, 'operator');
    if (!stepsDown) refresh();
    if (!complete) return failure('stale', change, { ids });
    count = ids.length;
  } catch (error) {
    // What went wrong, not who it went wrong for.
    console.error('Could not change members:', error instanceof Error ? error.message : error);
    return failure('failed', change, { ids });
  }

  if (stepsDown) redirect(`/${locale}/me`);
  return { ok: true, at: Date.now(), change, count };
}

// Makes everyone in `userIds` an `AppRole` (the same for all of them). Operators may only move
// people between guest and member; admins may set any role. Refuses the whole batch if anyone in
// it is not allowed (the answer names them) or if it would leave the site without an admin.
export async function changeRoles(
  localeArg: Locale,
  userIds: string[],
  to: AppRole,
): Promise<MemberResult> {
  return applyChange(localeArg, userIds, { kind: 'role', to });
}

// Blocks (or unblocks) everyone in `userIds`: the site's record, and a ban in Auth so the account
// cannot sign in again. Operators may do it to guests and members, admins to anyone but
// themselves. Refuses the whole batch if anyone in it is not allowed, naming them.
export async function setBlocked(
  localeArg: Locale,
  userIds: string[],
  blocked: boolean,
): Promise<MemberResult> {
  return applyChange(localeArg, userIds, { kind: 'block', blocked });
}

// What the members table calls. `useActionState` hands the previous state in front of the form, and
// everything else rides in the form: the language as `locale`, the people as `id` (one per ticked
// row), the change as the pressed button's `to=<role>` or `blocked=<true|false>`, and for a
// consequential change the second yes as `confirm=1` (without it the answer is a question, see
// needsConfirmation; this is how the question works with no scripts at all, so a plain click path
// cannot skip it) or `cancel`, which drops the question. (Binding the
// language as an argument is the usual way, but it makes React render the form forever when a
// plain form post, with no JavaScript, is refused and the form is shown again; see submitProfile.)
export async function submitMemberAction(
  _previous: MemberState,
  form: FormData,
): Promise<MemberState> {
  const { locale, ids, change, confirmed, cancelled } = readMemberForm(form);
  // No is the answer to the question and changes nothing: the form is shown again as it was.
  if (cancelled) return null;
  // applyChange checks all of it (an unknown language is a 404).
  return applyChange(locale as Locale, ids, change, confirmed);
}
