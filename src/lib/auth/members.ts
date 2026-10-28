import { ROLE_ORDER, canBlock, canChangeRole, type AppRole } from './roles';

// The rules of the members screen that do not need a database: reading the address, what a batch
// of changes may and may not do, and the shape of what the server sends back to the form. This
// module has no runtime imports besides the role rules, so the screen in the browser and the
// server actions can both use it.

export const MEMBERS_PAGE_SIZE = 50;
// A batch is made of rows that were on one page, so it is never larger than one.
export const MEMBERS_BATCH_MAX = MEMBERS_PAGE_SIZE;
const SEARCH_MAX = 100;
// The most names a refusal spells out; the rest are counted.
export const REFUSED_NAMES_SHOWN = 10;

// ---------------------------------------------------------------------------
// The address: ?q=...&role=...&optin=1&page=2
// ---------------------------------------------------------------------------

export type MembersQuery = {
  q: string;
  role: AppRole | null;
  optIn: boolean;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;

// A value that is one string. A repeated parameter (`?q=a&q=b`) arrives as a list and counts as
// absent: nobody has a reason to send two.
function single(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function isRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (ROLE_ORDER as readonly string[]).includes(value);
}

// What the address asks for, with anything unusable left at its default: no search, every role,
// everyone, the first page.
export function parseMembersQuery(params: Params): MembersQuery {
  const q = Array.from((single(params.q) ?? '').replace(/\s+/g, ' ').trim())
    .slice(0, SEARCH_MAX)
    .join('')
    .trim();
  const role = single(params.role);
  const page = single(params.page);
  return {
    q,
    role: isRole(role) ? role : null,
    optIn: single(params.optin) === '1',
    page: page !== undefined && /^\d{1,6}$/.test(page) ? Math.max(1, Number(page)) : 1,
  };
}

// The parameters of a link to `page` of the same list: only what differs from the defaults.
export function membersParams(query: MembersQuery, page = query.page): Record<string, string> {
  const params: Record<string, string> = {};
  if (query.q) params.q = query.q;
  if (query.role) params.role = query.role;
  if (query.optIn) params.optin = '1';
  if (page > 1) params.page = String(page);
  return params;
}

export function hasFilters(query: MembersQuery): boolean {
  return query.q !== '' || query.role !== null || query.optIn;
}

// The pattern for an ILIKE that finds `q` anywhere in the search text. What the person typed is
// taken literally: the characters that mean something to LIKE are escaped, so "100%" looks for
// "100%" and not for "100" followed by anything. (The search text is lower case; ILIKE ignores the
// case of the pattern.)
export function searchPattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / MEMBERS_PAGE_SIZE));
}

// The first and last row of a page, counted from 0 (what `range()` takes).
export function pageRange(page: number): [number, number] {
  const from = (page - 1) * MEMBERS_PAGE_SIZE;
  return [from, from + MEMBERS_PAGE_SIZE - 1];
}

// ---------------------------------------------------------------------------
// What may be done to whom
// ---------------------------------------------------------------------------

// Whether this actor has any button that could change this person. A row for which there is none
// is shown but cannot be ticked.
export function canManage(actor: AppRole, target: AppRole, self: boolean): boolean {
  return canBlock(actor, target, self) || ROLE_ORDER.some((to) => canChangeRole(actor, target, to));
}

export type MemberTarget = { id: string; role: AppRole; blocked: boolean };

// Whether the changes would leave the site without an unblocked admin. `adminIds` are the admins
// who can sign in now; `losing` are the people who stop being one. A site that has none already
// is not made worse by a change that touches no admin, so only a change that takes the last
// one(s) away counts.
export function leavesNoAdmin(adminIds: readonly string[], losing: readonly string[]): boolean {
  const going = new Set(losing);
  const affected = adminIds.filter((id) => going.has(id));
  return affected.length > 0 && affected.length === adminIds.length;
}

export type Plan =
  | { ok: true }
  | { ok: false; error: 'refused'; refused: string[] }
  | { ok: false; error: 'lastAdmin' };

type Actor = { id: string; role: AppRole };

// Checks a batch of role changes against the people's roles as they are now. The whole batch is
// refused if anyone in it may not be changed by this actor (naming them), or if it would leave
// the site without an admin.
export function planRoleChange(
  actor: Actor,
  targets: readonly MemberTarget[],
  to: AppRole,
  adminIds: readonly string[],
): Plan {
  const refused = targets.filter((t) => !canChangeRole(actor.role, t.role, to)).map((t) => t.id);
  if (refused.length > 0) return { ok: false, error: 'refused', refused };

  const losing = to === 'admin' ? [] : targets.filter((t) => t.role === 'admin').map((t) => t.id);
  if (leavesNoAdmin(adminIds, losing)) return { ok: false, error: 'lastAdmin' };
  return { ok: true };
}

// The same for blocking (`blocked`) and unblocking. Unblocking takes the same authority as
// blocking, and nobody can do either to themselves.
export function planBlock(
  actor: Actor,
  targets: readonly MemberTarget[],
  blocked: boolean,
  adminIds: readonly string[],
): Plan {
  const refused = targets
    .filter((t) => !canBlock(actor.role, t.role, t.id === actor.id))
    .map((t) => t.id);
  if (refused.length > 0) return { ok: false, error: 'refused', refused };

  const losing = blocked ? targets.filter((t) => t.role === 'admin').map((t) => t.id) : [];
  if (leavesNoAdmin(adminIds, losing)) return { ok: false, error: 'lastAdmin' };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// The form and what comes back from it
// ---------------------------------------------------------------------------

// One change for the whole batch: everyone becomes `to`, or everyone is blocked / unblocked.
export type MemberChange = { kind: 'role'; to: AppRole } | { kind: 'block'; blocked: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Whether `ids` is a usable list of accounts: not empty, not longer than a page, nothing that is
// not an id, nobody twice.
export function cleanIds(ids: readonly unknown[]): string[] | null {
  const clean = ids.filter((id): id is string => typeof id === 'string' && UUID.test(id));
  if (clean.length !== ids.length) return null;
  const unique = Array.from(new Set(clean.map((id) => id.toLowerCase())));
  return unique.length > 0 && unique.length <= MEMBERS_BATCH_MAX ? unique : null;
}

export type MemberForm = { locale: string; ids: unknown[]; change: MemberChange | null };

// Reads the form of the members table. The buttons are named after what the actions take: a role
// button is `to=<role>`, a block button `blocked=true` or `blocked=false`. A form with both, or
// neither, or a value that is not one of those, has no change (and so does nothing).
export function readMemberForm(form: FormData): MemberForm {
  const locale = form.get('locale');
  const to = form.get('to');
  const blocked = form.get('blocked');

  let change: MemberChange | null = null;
  if (to !== null && blocked === null) {
    if (isRole(to)) change = { kind: 'role', to };
  } else if (blocked !== null && to === null) {
    if (blocked === 'true' || blocked === 'false') {
      change = { kind: 'block', blocked: blocked === 'true' };
    }
  }

  return {
    locale: typeof locale === 'string' ? locale : '',
    ids: form.getAll('id'),
    change,
  };
}

// What the form shows after an action. A change that went through is `ok` with how many people it
// touched. A refused one says why: `none` nobody was chosen, `refused` somebody in the batch may
// not be changed (their names are listed, `more` counts those that did not fit), `lastAdmin` the
// site would be left without an admin, `missing` somebody is no longer on the list, `stale`
// somebody changed under the action's feet and only part of it went through, `failed` anything
// else. `ids` are the people who were chosen, so the form can keep them ticked. `at` tells one
// answer from the next so it can be announced again.
export type MemberSuccess = { ok: true; at: number; change: MemberChange; count: number };
export type MemberFailure = {
  ok: false;
  at: number;
  error: 'none' | 'refused' | 'lastAdmin' | 'missing' | 'stale' | 'failed';
  change: MemberChange | null;
  names: string[];
  more: number;
  ids: string[];
};
export type MemberResult = MemberSuccess | MemberFailure;
export type MemberState = MemberResult | null;
