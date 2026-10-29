import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ refresh: vi.fn() }));
// Next throws from notFound() to stop rendering; the fake does the same so the code under test
// cannot carry on past it.
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock('@/lib/auth/config', () => ({ isAuthEnabled: vi.fn(() => true) }));
vi.mock('@/lib/auth/viewer', () => ({ getViewer: vi.fn(), requireRole: vi.fn() }));
vi.mock('@/lib/auth/last-admin', () => ({ unblockedAdminIds: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }));

import { refresh } from 'next/cache';
import { notFound } from 'next/navigation';
import { isAuthEnabled } from '@/lib/auth/config';
import { unblockedAdminIds } from '@/lib/auth/last-admin';
import type { AppRole } from '@/lib/auth/roles';
import { getViewer, requireRole, type Viewer } from '@/lib/auth/viewer';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { changeRoles, setBlocked, submitMemberAction } from '@/app/[locale]/admin/members/actions';

// Fake people. Ids are valid UUIDs, since the action refuses anything else.
const id = (n: number) => `5eed0000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = id(1);
const OTHER_ADMIN = id(2);
const OPERATOR = id(3);
const GUEST = id(4);
const MEMBER = id(5);
const GUEST_2 = id(6);
const BLOCKED_MEMBER = id(7);
// Signed in once and never finished the sign-up form.
const UNFINISHED = id(8);

type RoleRow = { user_id: string; role: AppRole; blocked_at: string | null; updated_by?: string };
type ProfileRow = {
  id: string;
  email: string;
  last_name: string | null;
  first_name: string | null;
  onboarded_at: string | null;
};

type Filter =
  | { kind: 'in'; column: string; values: unknown[] }
  | { kind: 'is'; column: string; value: null }
  | { kind: 'not'; column: string; value: null };

// A small stand-in for the database and the secret-key client: tables the action reads and writes,
// with the filters it uses applied for real, so the tests can look at what is left in the "tables".
function makeDb(
  people: {
    id: string;
    role: AppRole;
    blocked?: boolean;
    name?: [string, string];
    // Everyone has finished signing up unless said otherwise.
    unfinished?: boolean;
  }[],
) {
  const roles = new Map<string, RoleRow>();
  const profiles = new Map<string, ProfileRow>();
  for (const p of people) {
    roles.set(p.id, { user_id: p.id, role: p.role, blocked_at: p.blocked ? 'before' : null });
    profiles.set(p.id, {
      id: p.id,
      email: `${p.id.slice(-2)}@example.test`,
      last_name: p.name?.[0] ?? null,
      first_name: p.name?.[1] ?? null,
      onboarded_at: p.unfinished ? null : 'before',
    });
  }

  const log = { updates: [] as unknown[], bans: [] as [string, string][], queried: 0 };
  const hooks = {
    // Runs after the action has read the people and before it writes: a concurrent change.
    afterRead: (() => {}) as () => void,
    updateError: null as string | null,
    banFails: new Set<string>(),
    banThrows: false,
  };

  function matches<Row extends object>(row: Row, filters: Filter[]) {
    return filters.every((f) => {
      const value = row[f.column as keyof Row];
      if (f.kind === 'in') return f.values.includes(value);
      if (f.kind === 'is') return value === f.value;
      return value !== f.value;
    });
  }

  function from(table: string) {
    const filters: Filter[] = [];
    let patch: Record<string, unknown> | null = null;
    const builder = {
      select: () => builder,
      update(value: Record<string, unknown>) {
        patch = value;
        return builder;
      },
      in(column: string, values: unknown[]) {
        filters.push({ kind: 'in', column, values });
        return builder;
      },
      is(column: string, value: null) {
        filters.push({ kind: 'is', column, value });
        return builder;
      },
      not(column: string, _operator: string, value: null) {
        filters.push({ kind: 'not', column, value });
        return builder;
      },
      then(resolve: (result: unknown) => void) {
        log.queried += 1;
        if (patch) {
          log.updates.push({ table, patch, filters });
          if (hooks.updateError)
            return resolve({ data: null, error: { message: hooks.updateError } });
          const hit = [...roles.values()].filter((row) => matches(row, filters));
          for (const row of hit) Object.assign(row, patch);
          return resolve({ data: hit.map((row) => ({ user_id: row.user_id })), error: null });
        }
        if (table === 'user_roles') {
          const rows = [...roles.values()].filter((row) => matches(row, filters));
          // The action reads the people, then (if the test wants) the world moves on.
          queueMicrotask(() => hooks.afterRead());
          return resolve({
            data: rows.map(({ user_id, role, blocked_at }) => ({ user_id, role, blocked_at })),
            error: null,
          });
        }
        // Profiles are always asked for by id; with no id filter, nobody.
        if (!filters.some((f) => f.kind === 'in' && f.column === 'id')) {
          return resolve({ data: [], error: null });
        }
        return resolve({
          data: [...profiles.values()].filter((row) => matches(row, filters)),
          error: null,
        });
      },
    };
    return builder;
  }

  const client = {
    from,
    auth: {
      admin: {
        updateUserById: vi.fn(async (userId: string, attributes: { ban_duration?: string }) => {
          if (hooks.banThrows) throw new Error('network');
          log.bans.push([userId, attributes.ban_duration ?? '']);
          return hooks.banFails.has(userId)
            ? { data: null, error: { code: 'unexpected_failure', message: 'nope' } }
            : { data: {}, error: null };
        }),
      },
    },
  };
  vi.mocked(createSupabaseAdminClient).mockReturnValue(
    client as unknown as ReturnType<typeof createSupabaseAdminClient>,
  );
  return { roles, profiles, log, hooks };
}

function actorViewer(role: AppRole, userId: string): Viewer {
  return {
    id: userId,
    email: 'actor@example.test',
    role,
    blocked: false,
    onboarded: true,
  } as Viewer;
}

// Signs the fake visitor in as this person, as requireRole would find them.
function actAs(role: AppRole, userId: string) {
  vi.mocked(getViewer).mockResolvedValue(actorViewer(role, userId));
  vi.mocked(requireRole).mockResolvedValue(actorViewer(role, userId));
}

function adminsAre(...ids: string[]) {
  vi.mocked(unblockedAdminIds).mockResolvedValue(ids);
}

const SITE = [
  { id: ADMIN, role: 'admin' as const, name: ['최', '관리'] as [string, string] },
  { id: OTHER_ADMIN, role: 'admin' as const, name: ['정', '관리자'] as [string, string] },
  { id: OPERATOR, role: 'operator' as const, name: ['박', '운영'] as [string, string] },
  { id: GUEST, role: 'guest' as const, name: ['김', '가입'] as [string, string] },
  { id: MEMBER, role: 'member' as const, name: ['이', '회원'] as [string, string] },
  { id: GUEST_2, role: 'guest' as const, name: ['한', '둘'] as [string, string] },
  {
    id: BLOCKED_MEMBER,
    role: 'member' as const,
    blocked: true,
    name: ['오', '차단'] as [string, string],
  },
  { id: UNFINISHED, role: 'guest' as const, unfinished: true },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isAuthEnabled).mockReturnValue(true);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('changeRoles', () => {
  it('lets an operator make a guest a member, and records who did it', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN, OTHER_ADMIN);

    const result = await changeRoles('ko', [GUEST], 'member');

    expect(result).toMatchObject({ ok: true, count: 1, change: { kind: 'role', to: 'member' } });
    expect(db.roles.get(GUEST)).toMatchObject({ role: 'member', updated_by: OPERATOR });
    expect(db.roles.get(MEMBER)?.role).toBe('member');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('asks who is asking again, from the database, for the operator level', async () => {
    makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN, OTHER_ADMIN);
    await changeRoles('en', [GUEST], 'member');
    expect(requireRole).toHaveBeenCalledWith('en', 'operator', '/en/admin/members');
  });

  it('changes a whole batch at once', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN);
    const result = await changeRoles('ko', [GUEST, GUEST_2], 'member');
    expect(result).toMatchObject({ ok: true, count: 2 });
    expect(db.roles.get(GUEST)?.role).toBe('member');
    expect(db.roles.get(GUEST_2)?.role).toBe('member');
  });

  it('refuses an operator who asks for a role above member, and writes nothing', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN);
    for (const to of ['operator', 'admin'] as const) {
      const result = await changeRoles('ko', [GUEST], to);
      expect(result).toMatchObject({
        ok: false,
        error: 'refused',
        groups: [{ reason: 'authority', names: ['김가입'], more: 0 }],
        ids: [GUEST],
      });
    }
    expect(db.roles.get(GUEST)?.role).toBe('guest');
    expect(db.log.updates).toEqual([]);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refuses the whole batch when one person in it may not be changed, and names them', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN, OTHER_ADMIN);

    // The guest alone would be fine; the admin and the operator are not.
    const result = await changeRoles('ko', [GUEST, ADMIN, OPERATOR], 'member');

    expect(result).toMatchObject({
      ok: false,
      error: 'refused',
      groups: [{ reason: 'authority', names: ['최관리', '박운영'], more: 0 }],
      ids: [GUEST, ADMIN, OPERATOR],
    });
    expect(db.roles.get(GUEST)?.role).toBe('guest');
    expect(db.roles.get(ADMIN)?.role).toBe('admin');
    expect(db.log.updates).toEqual([]);
  });

  it('writes names in the language of the page', async () => {
    makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN);

    const english = await changeRoles('en', [MEMBER, ADMIN], 'member');
    // The English order is given name first. (The member already is one; the admin is out of an
    // operator's reach.)
    expect(english).toMatchObject({
      ok: false,
      groups: [
        { reason: 'authority', names: ['관리 최'] },
        { reason: 'same', names: ['회원 이'] },
      ],
    });

    const korean = await changeRoles('ko', [GUEST_2], 'guest');
    expect(korean).toMatchObject({ ok: false, groups: [{ reason: 'same', names: ['한둘'] }] });
  });

  it('does not list more than ten names, and counts the rest', async () => {
    const crowd = Array.from({ length: 13 }, (_, i) => ({
      id: id(100 + i),
      role: 'operator' as const,
      name: ['성', `이름${i}`] as [string, string],
    }));
    makeDb([...SITE, ...crowd]);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN);
    const result = await changeRoles(
      'ko',
      crowd.map((c) => c.id),
      'member',
    );
    expect(result).toMatchObject({ ok: false, error: 'refused' });
    const [group] = (result as { groups: { names: string[]; more: number }[] }).groups;
    expect(group.names).toHaveLength(10);
    expect(group.more).toBe(3);
  });

  it('counts a change to the role someone already has as not allowed, and says that is why', async () => {
    makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN);
    expect(await changeRoles('ko', [GUEST, MEMBER], 'member')).toMatchObject({
      ok: false,
      error: 'refused',
      groups: [{ reason: 'same', names: ['이회원'], more: 0 }],
    });
  });

  it('gives each person the reason of their own, one group per reason', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN, OTHER_ADMIN);
    // The admin is out of reach, the member already is one, the guest alone would be fine.
    const result = await changeRoles('ko', [ADMIN, GUEST, MEMBER, OTHER_ADMIN], 'member');
    expect(result).toMatchObject({
      ok: false,
      error: 'refused',
      groups: [
        { reason: 'authority', names: ['최관리', '정관리자'], more: 0 },
        { reason: 'same', names: ['이회원'], more: 0 },
      ],
    });
    // Nothing in the batch was applied, the guest included.
    expect(db.roles.get(GUEST)?.role).toBe('guest');
    expect(db.log.updates).toEqual([]);
  });

  it('lets an admin set any role', async () => {
    const db = makeDb(SITE);
    actAs('admin', ADMIN);
    adminsAre(ADMIN, OTHER_ADMIN);
    expect(await changeRoles('ko', [MEMBER], 'operator')).toMatchObject({ ok: true });
    expect(await changeRoles('ko', [GUEST], 'admin')).toMatchObject({ ok: true });
    expect(db.roles.get(MEMBER)?.role).toBe('operator');
    expect(db.roles.get(GUEST)).toMatchObject({ role: 'admin', updated_by: ADMIN });
  });

  it('refuses to demote the last admin, and writes nothing', async () => {
    const db = makeDb(SITE);
    actAs('admin', ADMIN);
    adminsAre(ADMIN);
    for (const to of ['member', 'guest', 'operator'] as const) {
      expect(await changeRoles('ko', [ADMIN], to)).toMatchObject({
        ok: false,
        error: 'lastAdmin',
        ids: [ADMIN],
      });
    }
    expect(db.roles.get(ADMIN)?.role).toBe('admin');
    expect(db.log.updates).toEqual([]);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('takes an admin who steps down below operator to My page, where the new role is shown', async () => {
    const db = makeDb(SITE);
    actAs('admin', ADMIN);
    adminsAre(ADMIN, OTHER_ADMIN);
    await expect(changeRoles('en', [ADMIN], 'member')).rejects.toThrow('NEXT_REDIRECT /en/me');
    expect(db.roles.get(ADMIN)?.role).toBe('member');
    // The page they were on would be a 404 now, so it is not refreshed under them.
    expect(refresh).not.toHaveBeenCalled();
  });

  it('keeps an admin who steps down to operator on the screen they already use', async () => {
    const db = makeDb(SITE);
    actAs('admin', ADMIN);
    adminsAre(ADMIN, OTHER_ADMIN);
    expect(await changeRoles('ko', [ADMIN], 'operator')).toMatchObject({ ok: true });
    expect(db.roles.get(ADMIN)?.role).toBe('operator');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refuses a batch that takes every admin away at once', async () => {
    const db = makeDb(SITE);
    actAs('admin', ADMIN);
    adminsAre(ADMIN, OTHER_ADMIN);
    expect(await changeRoles('ko', [ADMIN, OTHER_ADMIN], 'member')).toMatchObject({
      ok: false,
      error: 'lastAdmin',
    });
    expect(db.log.updates).toEqual([]);
  });

  it('refuses an empty choice, and one that is not a list of accounts', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN);

    expect(await changeRoles('ko', [], 'member')).toMatchObject({ ok: false, error: 'none' });
    for (const bad of [
      ['not-an-id'],
      [GUEST, "x'; drop table user_roles; --"],
      [GUEST, 42],
      Array.from({ length: 51 }, (_, i) => id(200 + i)),
      'all',
      null,
      { 0: GUEST },
    ]) {
      expect(
        await changeRoles('ko', bad as unknown as string[], 'member'),
        JSON.stringify(bad),
      ).toMatchObject({ ok: false, error: 'failed' });
    }
    // Not a role.
    expect(await changeRoles('ko', [GUEST], 'root' as AppRole)).toMatchObject({
      ok: false,
      error: 'failed',
    });
    expect(db.log.updates).toEqual([]);
  });

  it('refuses a batch with somebody who is no longer there', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN);
    expect(await changeRoles('ko', [GUEST, id(999)], 'member')).toMatchObject({
      ok: false,
      error: 'missing',
      ids: [GUEST, id(999)],
    });
    expect(db.roles.get(GUEST)?.role).toBe('guest');
  });

  it('treats an account that has not finished signing up as not there, and changes nobody', async () => {
    const db = makeDb(SITE);
    // Whoever asks and whatever the change: the members screen does not list such an account,
    // so an id of one can only come from a crafted request.
    for (const [role, actor] of [
      ['operator', OPERATOR],
      ['admin', ADMIN],
    ] as const) {
      actAs(role, actor);
      adminsAre(ADMIN, OTHER_ADMIN);
      expect(await changeRoles('ko', [GUEST, UNFINISHED], 'member')).toMatchObject({
        ok: false,
        error: 'missing',
        ids: [GUEST, UNFINISHED],
      });
      expect(await changeRoles('ko', [UNFINISHED], 'admin')).toMatchObject({
        ok: false,
        error: 'missing',
      });
      expect(await setBlocked('ko', [UNFINISHED], true)).toMatchObject({
        ok: false,
        error: 'missing',
      });
    }
    expect(db.roles.get(GUEST)?.role).toBe('guest');
    expect(db.roles.get(UNFINISHED)).toMatchObject({ role: 'guest', blocked_at: null });
    expect(db.log.updates).toEqual([]);
    expect(db.log.bans).toEqual([]);
  });

  it('does not overwrite a role that was raised after the list was read', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN);
    // Between the read and the write an admin makes the guest an operator.
    db.hooks.afterRead = () => {
      db.roles.get(GUEST)!.role = 'operator';
    };
    const result = await changeRoles('ko', [GUEST], 'member');
    expect(result).toMatchObject({ ok: false, error: 'stale' });
    expect(db.roles.get(GUEST)?.role).toBe('operator');
    // The screen is told to look again.
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('fails without writing when the database cannot be read', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    vi.mocked(unblockedAdminIds).mockRejectedValue(new Error('down'));
    expect(await changeRoles('ko', [GUEST], 'member')).toMatchObject({
      ok: false,
      error: 'failed',
    });
    expect(db.log.updates).toEqual([]);
  });

  it('fails when the write is refused', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN);
    db.hooks.updateError = 'boom';
    expect(await changeRoles('ko', [GUEST], 'member')).toMatchObject({
      ok: false,
      error: 'failed',
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('fails when the visitor cannot be looked up', async () => {
    const db = makeDb(SITE);
    vi.mocked(getViewer).mockRejectedValue(new Error('down'));
    expect(await changeRoles('ko', [GUEST], 'member')).toMatchObject({
      ok: false,
      error: 'failed',
    });
    expect(requireRole).not.toHaveBeenCalled();
    expect(db.log.queried).toBe(0);
  });

  it('is a 404 for a visitor below operator, a blocked one or an unknown language, before it reads anything', async () => {
    const db = makeDb(SITE);
    vi.mocked(getViewer).mockResolvedValue(actorViewer('member', MEMBER));
    vi.mocked(requireRole).mockRejectedValue(new Error('NEXT_NOT_FOUND'));
    await expect(changeRoles('ko', [GUEST], 'member')).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(setBlocked('ko', [GUEST], true)).rejects.toThrow('NEXT_NOT_FOUND');
    expect(db.log.queried).toBe(0);
    expect(db.log.updates).toEqual([]);

    await expect(changeRoles('xx' as 'ko', [GUEST], 'member')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('does not exist while accounts are switched off', async () => {
    vi.mocked(isAuthEnabled).mockReturnValue(false);
    await expect(changeRoles('ko', [GUEST], 'member')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
    expect(getViewer).not.toHaveBeenCalled();
  });
});

describe('setBlocked', () => {
  it('blocks in the site’s record and in Auth, and records who did it', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN);

    const result = await setBlocked('ko', [GUEST, MEMBER], true);

    expect(result).toMatchObject({ ok: true, count: 2, change: { kind: 'block', blocked: true } });
    for (const who of [GUEST, MEMBER]) {
      expect(db.roles.get(who)?.blocked_at).not.toBeNull();
      expect(db.roles.get(who)?.updated_by).toBe(OPERATOR);
    }
    expect(db.log.bans.sort()).toEqual(
      [
        [GUEST, '876000h'],
        [MEMBER, '876000h'],
      ].sort(),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps the first block date when somebody who is blocked already is blocked again', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN);
    const result = await setBlocked('ko', [BLOCKED_MEMBER, GUEST], true);
    expect(result).toMatchObject({ ok: true, count: 2 });
    expect(db.roles.get(BLOCKED_MEMBER)?.blocked_at).toBe('before');
    expect(db.roles.get(GUEST)?.blocked_at).not.toBe('before');
    // Both are banned in Auth, the one already blocked included.
    expect(db.log.bans.map(([who]) => who).sort()).toEqual([BLOCKED_MEMBER, GUEST].sort());
  });

  it('unblocks: lifts the ban in Auth and clears the date', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN);
    const result = await setBlocked('ko', [BLOCKED_MEMBER], false);
    expect(result).toMatchObject({ ok: true, count: 1, change: { kind: 'block', blocked: false } });
    expect(db.roles.get(BLOCKED_MEMBER)).toMatchObject({ blocked_at: null, updated_by: OPERATOR });
    expect(db.log.bans).toEqual([[BLOCKED_MEMBER, 'none']]);
  });

  it('refuses an operator who tries it on staff, an admin or themselves, naming them', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN, OTHER_ADMIN);
    for (const blocked of [true, false]) {
      const result = await setBlocked('ko', [GUEST, ADMIN, OPERATOR], blocked);
      expect(result).toMatchObject({
        ok: false,
        error: 'refused',
        // The admin is out of an operator's reach; the operator is themselves.
        groups: [
          { reason: 'authority', names: ['최관리'], more: 0 },
          { reason: 'self', names: ['박운영'], more: 0 },
        ],
        change: { kind: 'block', blocked },
      });
    }
    expect(db.log.updates).toEqual([]);
    expect(db.log.bans).toEqual([]);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('never lets anybody block themselves, an admin included', async () => {
    const db = makeDb(SITE);
    actAs('admin', ADMIN);
    adminsAre(ADMIN, OTHER_ADMIN);
    expect(await setBlocked('ko', [ADMIN], true)).toMatchObject({
      ok: false,
      error: 'refused',
      groups: [{ reason: 'self', names: ['최관리'], more: 0 }],
    });
    expect(db.roles.get(ADMIN)?.blocked_at).toBeNull();
    expect(db.log.bans).toEqual([]);
  });

  it('lets an admin block another admin while a third stays', async () => {
    const db = makeDb(SITE);
    actAs('admin', ADMIN);
    adminsAre(ADMIN, OTHER_ADMIN);
    expect(await setBlocked('ko', [OTHER_ADMIN], true)).toMatchObject({ ok: true });
    expect(db.roles.get(OTHER_ADMIN)?.blocked_at).not.toBeNull();
  });

  it('refuses to block the last admin who can sign in, whoever asks', async () => {
    // (Reachable only in a race: the person asking is an admin themselves, so they stay. A
    // stale answer to "who are the admins" is enough to make the rule bite.)
    const db = makeDb(SITE);
    actAs('admin', ADMIN);
    adminsAre(OTHER_ADMIN);
    expect(await setBlocked('ko', [OTHER_ADMIN], true)).toMatchObject({
      ok: false,
      error: 'lastAdmin',
    });
    expect(db.roles.get(OTHER_ADMIN)?.blocked_at).toBeNull();
    expect(db.log.bans).toEqual([]);
  });

  it('leaves the account blocked when Auth refuses the ban, and says it failed', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN);
    db.hooks.banFails.add(GUEST);
    const result = await setBlocked('ko', [GUEST, MEMBER], true);
    expect(result).toMatchObject({ ok: false, error: 'failed' });
    // The site's own record is what shuts the account out, and it is set.
    expect(db.roles.get(GUEST)?.blocked_at).not.toBeNull();
    expect(db.roles.get(MEMBER)?.blocked_at).not.toBeNull();
    // The screen looks again, and the attempt can be repeated (it is safe to).
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('leaves the account blocked when Auth refuses to lift the ban', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN);
    db.hooks.banFails.add(BLOCKED_MEMBER);
    expect(await setBlocked('ko', [BLOCKED_MEMBER], false)).toMatchObject({
      ok: false,
      error: 'failed',
    });
    expect(db.roles.get(BLOCKED_MEMBER)?.blocked_at).toBe('before');
  });

  it('does not block somebody whose role was raised after the list was read', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN);
    db.hooks.afterRead = () => {
      db.roles.get(GUEST)!.role = 'operator';
    };
    expect(await setBlocked('ko', [GUEST], true)).toMatchObject({ ok: false, error: 'stale' });
    expect(db.roles.get(GUEST)?.blocked_at).toBeNull();
    // And is not banned in Auth either: the ban follows the record.
    expect(db.log.bans).toEqual([]);
  });

  it('refuses a choice that is empty, malformed, or not a yes or no', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN);
    expect(await setBlocked('ko', [], true)).toMatchObject({ ok: false, error: 'none' });
    expect(await setBlocked('ko', ['nope'], true)).toMatchObject({ ok: false, error: 'failed' });
    expect(await setBlocked('ko', [GUEST], 'yes' as unknown as boolean)).toMatchObject({
      ok: false,
      error: 'failed',
    });
    expect(db.log.updates).toEqual([]);
    expect(db.log.bans).toEqual([]);
  });
});

describe('submitMemberAction', () => {
  function form(entries: [string, string][]): FormData {
    const data = new FormData();
    for (const [name, value] of entries) data.append(name, value);
    return data;
  }

  it('makes a role change of a role button', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN);
    const result = await submitMemberAction(
      null,
      form([
        ['locale', 'ko'],
        ['id', GUEST],
        ['id', GUEST_2],
        ['to', 'member'],
      ]),
    );
    expect(result).toMatchObject({ ok: true, count: 2 });
    expect(db.roles.get(GUEST)?.role).toBe('member');
    expect(db.roles.get(GUEST_2)?.role).toBe('member');
  });

  it('blocks and unblocks with the block buttons', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN);
    expect(
      await submitMemberAction(
        null,
        form([
          ['locale', 'ko'],
          ['id', GUEST],
          ['blocked', 'true'],
          ['confirm', '1'],
        ]),
      ),
    ).toMatchObject({ ok: true });
    expect(db.roles.get(GUEST)?.blocked_at).not.toBeNull();
    expect(
      await submitMemberAction(
        null,
        form([
          ['locale', 'ko'],
          ['id', GUEST],
          ['blocked', 'false'],
        ]),
      ),
    ).toMatchObject({ ok: true });
    expect(db.roles.get(GUEST)?.blocked_at).toBeNull();
  });

  describe('the second yes', () => {
    const consequential: [string, [string, string]][] = [
      ['blocking', ['blocked', 'true']],
      ['making an operator', ['to', 'operator']],
      ['making an admin', ['to', 'admin']],
    ];

    for (const [what, button] of consequential) {
      it(`asks again before ${what}, and changes nothing until the answer is yes`, async () => {
        const db = makeDb(SITE);
        actAs('admin', ADMIN);
        adminsAre(ADMIN, OTHER_ADMIN);
        const asked = await submitMemberAction(
          null,
          form([['locale', 'ko'], ['id', GUEST], ['id', GUEST_2], button]),
        );
        expect(asked).toMatchObject({ ok: false, error: 'confirm', ids: [GUEST, GUEST_2] });
        expect(db.log.updates).toEqual([]);
        expect(db.log.bans).toEqual([]);
        expect(refresh).not.toHaveBeenCalled();

        const done = await submitMemberAction(
          null,
          form([['locale', 'ko'], ['id', GUEST], ['id', GUEST_2], button, ['confirm', '1']]),
        );
        expect(done).toMatchObject({ ok: true, count: 2 });
        expect(db.log.updates).not.toEqual([]);
      });
    }

    it('does not ask before the everyday changes', async () => {
      const db = makeDb(SITE);
      actAs('operator', OPERATOR);
      adminsAre(ADMIN);
      for (const [person, button] of [
        [GUEST, ['to', 'member']],
        [MEMBER, ['to', 'guest']],
        [BLOCKED_MEMBER, ['blocked', 'false']],
      ] as [string, [string, string]][]) {
        const result = await submitMemberAction(
          null,
          form([['locale', 'ko'], ['id', person], button]),
        );
        expect(result, button.join('=')).toMatchObject({ ok: true });
      }
      expect(db.log.updates).not.toEqual([]);
    });

    it('tells a refusal before it asks: nobody is asked to confirm what will not happen', async () => {
      const db = makeDb(SITE);
      actAs('operator', OPERATOR);
      adminsAre(ADMIN);
      expect(
        await submitMemberAction(
          null,
          form([
            ['locale', 'ko'],
            ['id', GUEST],
            ['id', ADMIN],
            ['blocked', 'true'],
          ]),
        ),
      ).toMatchObject({
        ok: false,
        error: 'refused',
        groups: [{ reason: 'authority', names: ['최관리'], more: 0 }],
      });
      // Nor when it would leave no admin.
      actAs('admin', ADMIN);
      adminsAre(ADMIN);
      expect(
        await submitMemberAction(
          null,
          form([
            ['locale', 'ko'],
            ['id', ADMIN],
            ['to', 'operator'],
          ]),
        ),
      ).toMatchObject({ ok: false, error: 'lastAdmin' });
      expect(db.log.updates).toEqual([]);
    });

    it('does not ask a person who is not allowed to ask: signed out is still the redirect', async () => {
      vi.mocked(getViewer).mockResolvedValue(actorViewer('member', MEMBER));
      vi.mocked(requireRole).mockRejectedValue(new Error('NEXT_NOT_FOUND'));
      await expect(
        submitMemberAction(
          null,
          form([
            ['locale', 'ko'],
            ['id', GUEST],
            ['blocked', 'true'],
          ]),
        ),
      ).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('takes no for an answer: a cancelled question does nothing and says nothing', async () => {
      const db = makeDb(SITE);
      actAs('admin', ADMIN);
      adminsAre(ADMIN, OTHER_ADMIN);
      expect(
        await submitMemberAction(
          null,
          form([
            ['locale', 'ko'],
            ['id', GUEST],
            ['to', 'admin'],
            ['cancel', '1'],
          ]),
        ),
      ).toBeNull();
      expect(db.log.updates).toEqual([]);
    });

    it('still asks nothing of the exported actions: they do what they are told', async () => {
      const db = makeDb(SITE);
      actAs('admin', ADMIN);
      adminsAre(ADMIN, OTHER_ADMIN);
      expect(await setBlocked('ko', [GUEST], true)).toMatchObject({ ok: true });
      expect(await changeRoles('ko', [GUEST_2], 'admin')).toMatchObject({ ok: true });
      expect(db.roles.get(GUEST)?.blocked_at).not.toBeNull();
    });
  });

  it('refuses a button the operator’s form does not have (to=operator)', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN);
    for (const to of ['operator', 'admin']) {
      const result = await submitMemberAction(
        null,
        form([
          ['locale', 'ko'],
          ['id', GUEST],
          ['to', to],
        ]),
      );
      expect(result).toMatchObject({
        ok: false,
        error: 'refused',
        groups: [{ reason: 'authority', names: ['김가입'], more: 0 }],
      });
    }
    expect(db.roles.get(GUEST)?.role).toBe('guest');
  });

  it('does nothing for a form that names no change, or two', async () => {
    const db = makeDb(SITE);
    actAs('operator', OPERATOR);
    adminsAre(ADMIN);
    for (const entries of [
      [
        ['locale', 'ko'],
        ['id', GUEST],
      ],
      [
        ['locale', 'ko'],
        ['id', GUEST],
        ['to', 'member'],
        ['blocked', 'true'],
      ],
      [
        ['locale', 'ko'],
        ['id', GUEST],
        ['to', 'root'],
      ],
      [
        ['locale', 'ko'],
        ['id', GUEST],
        ['blocked', 'maybe'],
      ],
    ] as [string, string][][]) {
      expect(await submitMemberAction(null, form(entries))).toMatchObject({
        ok: false,
        error: 'failed',
      });
    }
    expect(db.log.updates).toEqual([]);
  });

  it('still asks who is asking when the form names no change at all', async () => {
    vi.mocked(getViewer).mockResolvedValue(actorViewer('member', MEMBER));
    vi.mocked(requireRole).mockRejectedValue(new Error('NEXT_NOT_FOUND'));
    await expect(submitMemberAction(null, form([['locale', 'ko']]))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });

  it('is a 404 for an unknown or missing language', async () => {
    for (const locale of ['', 'xx']) {
      await expect(
        submitMemberAction(
          null,
          form([
            ['locale', locale],
            ['id', GUEST],
            ['to', 'member'],
          ]),
        ),
      ).rejects.toThrow('NEXT_NOT_FOUND');
    }
    await expect(
      submitMemberAction(
        null,
        form([
          ['id', GUEST],
          ['to', 'member'],
        ]),
      ),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
