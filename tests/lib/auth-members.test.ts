import { describe, expect, it } from 'vitest';
import {
  MEMBERS_BATCH_MAX,
  MEMBERS_PAGE_SIZE,
  REFUSED_NAMES_SHOWN,
  canManage,
  cleanIds,
  hasFilters,
  groupRefusals,
  leavesNoAdmin,
  membersParams,
  needsConfirmation,
  pageCount,
  pageRange,
  parseMembersQuery,
  planBlock,
  planRoleChange,
  readMemberForm,
  refusalReason,
  searchPattern,
  type MemberTarget,
} from '@/lib/auth/members';
import { ROLE_ORDER } from '@/lib/auth/roles';

const A = '5eed0000-0000-4000-8000-00000000000a';
const B = '5eed0000-0000-4000-8000-00000000000b';
const C = '5eed0000-0000-4000-8000-00000000000c';
const D = '5eed0000-0000-4000-8000-00000000000d';

function target(id: string, role: MemberTarget['role'], blocked = false): MemberTarget {
  return { id, role, blocked };
}

describe('parseMembersQuery', () => {
  it('starts from the defaults', () => {
    expect(parseMembersQuery({})).toEqual({ q: '', role: null, optIn: false, page: 1 });
  });

  it('reads a search, a role, the opt-in filter and a page', () => {
    expect(parseMembersQuery({ q: '김라이즈', role: 'guest', optin: '1', page: '3' })).toEqual({
      q: '김라이즈',
      role: 'guest',
      optIn: true,
      page: 3,
    });
  });

  it('tidies the search: spaces collapse and the ends are trimmed', () => {
    expect(parseMembersQuery({ q: '  rise \n  kim  ' }).q).toBe('rise kim');
    expect(parseMembersQuery({ q: '   ' }).q).toBe('');
  });

  it('cuts a very long search at 100 characters without splitting a character', () => {
    const q = parseMembersQuery({ q: '가'.repeat(300) }).q;
    expect(Array.from(q)).toHaveLength(100);
    const emoji = parseMembersQuery({ q: '😀'.repeat(300) }).q;
    expect(Array.from(emoji)).toHaveLength(100);
  });

  it('ignores a role that is not one', () => {
    expect(parseMembersQuery({ role: 'superuser' }).role).toBeNull();
    expect(parseMembersQuery({ role: '' }).role).toBeNull();
    expect(parseMembersQuery({ role: 'ADMIN' }).role).toBeNull();
  });

  it('turns the opt-in filter on only for the value 1', () => {
    expect(parseMembersQuery({ optin: 'true' }).optIn).toBe(false);
    expect(parseMembersQuery({ optin: '0' }).optIn).toBe(false);
    expect(parseMembersQuery({ optin: '1' }).optIn).toBe(true);
  });

  it('falls back to the first page for anything that is not a page number', () => {
    for (const page of ['0', '-1', '1.5', 'abc', '', '1e3', '9999999', ' 2']) {
      expect(parseMembersQuery({ page }).page, page).toBe(1);
    }
    expect(parseMembersQuery({ page: '007' }).page).toBe(7);
  });

  it('counts a repeated parameter as absent', () => {
    expect(
      parseMembersQuery({ q: ['a', 'b'], role: ['admin', 'guest'], page: ['2', '3'] }),
    ).toEqual({ q: '', role: null, optIn: false, page: 1 });
  });
});

describe('membersParams and hasFilters', () => {
  it('leaves out what is the default', () => {
    expect(membersParams({ q: '', role: null, optIn: false, page: 1 })).toEqual({});
    expect(membersParams({ q: 'kim', role: 'guest', optIn: true, page: 2 })).toEqual({
      q: 'kim',
      role: 'guest',
      optin: '1',
      page: '2',
    });
  });

  it('links to another page of the same list', () => {
    const query = { q: 'kim', role: null, optIn: false, page: 2 };
    expect(membersParams(query, 1)).toEqual({ q: 'kim' });
    expect(membersParams(query, 3)).toEqual({ q: 'kim', page: '3' });
  });

  it('knows whether the list is narrowed down', () => {
    expect(hasFilters({ q: '', role: null, optIn: false, page: 4 })).toBe(false);
    expect(hasFilters({ q: 'x', role: null, optIn: false, page: 1 })).toBe(true);
    expect(hasFilters({ q: '', role: 'member', optIn: false, page: 1 })).toBe(true);
    expect(hasFilters({ q: '', role: null, optIn: true, page: 1 })).toBe(true);
  });
});

describe('searchPattern', () => {
  it('looks for the text anywhere', () => {
    expect(searchPattern('kim')).toBe('%kim%');
  });

  it('takes what LIKE would read as a pattern literally', () => {
    expect(searchPattern('100%')).toBe('%100\\%%');
    expect(searchPattern('a_b')).toBe('%a\\_b%');
    expect(searchPattern('a\\b')).toBe('%a\\\\b%');
  });
});

describe('paging', () => {
  it('has 50 rows per page', () => {
    expect(MEMBERS_PAGE_SIZE).toBe(50);
  });

  it('counts pages, with at least one', () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(1)).toBe(1);
    expect(pageCount(50)).toBe(1);
    expect(pageCount(51)).toBe(2);
    expect(pageCount(101)).toBe(3);
  });

  it('gives the rows of a page counted from 0', () => {
    expect(pageRange(1)).toEqual([0, 49]);
    expect(pageRange(2)).toEqual([50, 99]);
  });
});

describe('canManage', () => {
  it('lets an operator act on guests and members, not on staff or on themselves', () => {
    expect(canManage('operator', 'guest', false)).toBe(true);
    expect(canManage('operator', 'member', false)).toBe(true);
    expect(canManage('operator', 'operator', false)).toBe(false);
    expect(canManage('operator', 'operator', true)).toBe(false);
    expect(canManage('operator', 'admin', false)).toBe(false);
  });

  it('lets an admin act on everyone, themselves included', () => {
    for (const role of ROLE_ORDER) {
      expect(canManage('admin', role, false), role).toBe(true);
    }
    expect(canManage('admin', 'admin', true)).toBe(true);
  });

  it('gives members and guests nothing to do', () => {
    for (const actor of ['member', 'guest'] as const) {
      for (const role of ROLE_ORDER) {
        expect(canManage(actor, role, false)).toBe(false);
      }
    }
  });
});

describe('leavesNoAdmin', () => {
  it('is true when the people leaving are every admin there is', () => {
    expect(leavesNoAdmin([A], [A])).toBe(true);
    expect(leavesNoAdmin([A, B], [B, A])).toBe(true);
  });

  it('is false while an admin stays', () => {
    expect(leavesNoAdmin([A, B], [A])).toBe(false);
    expect(leavesNoAdmin([A, B], [C])).toBe(false);
    expect(leavesNoAdmin([A], [])).toBe(false);
  });

  it('does not blame a change that touches no admin on a site that has none', () => {
    expect(leavesNoAdmin([], [])).toBe(false);
    expect(leavesNoAdmin([], [A])).toBe(false);
  });
});

describe('planRoleChange', () => {
  const operator = { id: A, role: 'operator' as const };
  const admin = { id: B, role: 'admin' as const };

  it('lets an operator move guests and members between the two', () => {
    expect(planRoleChange(operator, [target(C, 'guest')], 'member', [B])).toEqual({ ok: true });
    expect(planRoleChange(operator, [target(C, 'member')], 'guest', [B])).toEqual({ ok: true });
  });

  it('refuses an operator who asks for staff or admin, whoever the person is', () => {
    expect(planRoleChange(operator, [target(C, 'guest')], 'operator', [B])).toEqual({
      ok: false,
      error: 'refused',
      refused: [C],
    });
    expect(planRoleChange(operator, [target(C, 'member')], 'admin', [B])).toMatchObject({
      ok: false,
      error: 'refused',
    });
  });

  it('refuses an operator who tries to change staff, an admin or themselves', () => {
    expect(planRoleChange(operator, [target(D, 'admin')], 'member', [D])).toMatchObject({
      error: 'refused',
      refused: [D],
    });
    expect(planRoleChange(operator, [target(C, 'operator')], 'member', [B])).toMatchObject({
      error: 'refused',
    });
    expect(planRoleChange(operator, [target(A, 'operator')], 'member', [B])).toMatchObject({
      error: 'refused',
    });
  });

  it('refuses the whole batch and names everyone who is not allowed', () => {
    const plan = planRoleChange(
      operator,
      [target(C, 'guest'), target(D, 'operator'), target(B, 'admin')],
      'member',
      [B],
    );
    expect(plan).toEqual({ ok: false, error: 'refused', refused: [D, B] });
  });

  it('counts a change to the role someone already has as not allowed', () => {
    expect(planRoleChange(operator, [target(C, 'member')], 'member', [B])).toMatchObject({
      error: 'refused',
      refused: [C],
    });
    expect(planRoleChange(admin, [target(C, 'guest')], 'guest', [B])).toMatchObject({
      error: 'refused',
    });
  });

  it('lets an admin set any role', () => {
    for (const to of ROLE_ORDER) {
      const from = to === 'guest' ? 'member' : 'guest';
      expect(planRoleChange(admin, [target(C, from)], to, [B])).toEqual({ ok: true });
    }
  });

  it('refuses to demote the last admin, whoever asks and however', () => {
    // The only admin demotes themselves.
    expect(planRoleChange(admin, [target(B, 'admin')], 'member', [B])).toEqual({
      ok: false,
      error: 'lastAdmin',
    });
    expect(planRoleChange(admin, [target(B, 'admin')], 'operator', [B])).toEqual({
      ok: false,
      error: 'lastAdmin',
    });
    // Every admin in the batch, with nobody else left.
    expect(
      planRoleChange(admin, [target(B, 'admin'), target(C, 'admin')], 'guest', [B, C]),
    ).toEqual({ ok: false, error: 'lastAdmin' });
  });

  it('lets an admin demote an admin while another stays', () => {
    expect(planRoleChange(admin, [target(B, 'admin')], 'member', [B, C])).toEqual({ ok: true });
    expect(planRoleChange(admin, [target(C, 'admin')], 'member', [B, C])).toEqual({ ok: true });
  });

  it('lets a batch hand the role on while it takes it away', () => {
    // Promoting someone to admin does not remove an admin.
    expect(planRoleChange(admin, [target(C, 'member')], 'admin', [B])).toEqual({ ok: true });
  });

  it('does not count a blocked admin as one who stays', () => {
    // `adminIds` holds only admins who can sign in: B is the only one, C is blocked.
    expect(planRoleChange(admin, [target(B, 'admin')], 'member', [B])).toMatchObject({
      error: 'lastAdmin',
    });
    // Demoting the blocked one costs the site nothing.
    expect(planRoleChange(admin, [target(C, 'admin', true)], 'member', [B])).toEqual({
      ok: true,
    });
  });
});

describe('planBlock', () => {
  const operator = { id: A, role: 'operator' as const };
  const admin = { id: B, role: 'admin' as const };

  it('lets an operator block and unblock guests and members', () => {
    expect(planBlock(operator, [target(C, 'guest'), target(D, 'member')], true, [B])).toEqual({
      ok: true,
    });
    expect(planBlock(operator, [target(C, 'member', true)], false, [B])).toEqual({ ok: true });
  });

  it('refuses an operator who tries it on staff, on an admin or on themselves', () => {
    for (const [id, role] of [
      [C, 'operator'],
      [D, 'admin'],
      [A, 'operator'],
    ] as const) {
      expect(planBlock(operator, [target(id, role)], true, [D]), id).toMatchObject({
        error: 'refused',
        refused: [id],
      });
      expect(planBlock(operator, [target(id, role, true)], false, [D]), id).toMatchObject({
        error: 'refused',
      });
    }
  });

  it('refuses the whole batch and names everyone who is not allowed', () => {
    expect(
      planBlock(operator, [target(C, 'guest'), target(D, 'admin'), target(A, 'operator')], true, [
        D,
      ]),
    ).toEqual({ ok: false, error: 'refused', refused: [D, A] });
  });

  it('lets an admin block anyone else', () => {
    for (const role of ROLE_ORDER) {
      expect(planBlock(admin, [target(C, role)], true, [B, C]), role).toEqual({ ok: true });
    }
  });

  it('never lets anyone block themselves, an admin included', () => {
    expect(planBlock(admin, [target(B, 'admin')], true, [B, C])).toMatchObject({
      error: 'refused',
      refused: [B],
    });
    expect(planBlock(admin, [target(B, 'admin')], false, [B, C])).toMatchObject({
      error: 'refused',
    });
  });

  it('refuses to block the last admin even when the actor is not one (a race)', () => {
    // C is the only admin who can sign in, and somebody with the authority blocks them.
    expect(planBlock(admin, [target(C, 'admin')], true, [C])).toEqual({
      ok: false,
      error: 'lastAdmin',
    });
  });

  it('lets an admin block an admin while another stays, and always lets anyone be unblocked', () => {
    expect(planBlock(admin, [target(C, 'admin')], true, [B, C])).toEqual({ ok: true });
    expect(planBlock(admin, [target(C, 'admin', true)], false, [B])).toEqual({ ok: true });
    expect(planBlock(admin, [target(C, 'admin', true)], false, [])).toEqual({ ok: true });
  });
});

describe('needsConfirmation', () => {
  it('asks again before the changes that shut a person out or hand over the keys', () => {
    expect(needsConfirmation({ kind: 'block', blocked: true })).toBe(true);
    expect(needsConfirmation({ kind: 'role', to: 'operator' })).toBe(true);
    expect(needsConfirmation({ kind: 'role', to: 'admin' })).toBe(true);
  });

  it('does not ask before the everyday ones, which are easy to take back', () => {
    expect(needsConfirmation({ kind: 'block', blocked: false })).toBe(false);
    expect(needsConfirmation({ kind: 'role', to: 'member' })).toBe(false);
    expect(needsConfirmation({ kind: 'role', to: 'guest' })).toBe(false);
  });
});

describe('refusalReason', () => {
  const operator = { id: A, role: 'operator' as const };
  const admin = { id: B, role: 'admin' as const };

  it('says "already that role" for a role change that changes nothing', () => {
    expect(refusalReason(operator, target(C, 'member'), { kind: 'role', to: 'member' })).toBe(
      'same',
    );
    expect(refusalReason(admin, target(C, 'guest'), { kind: 'role', to: 'guest' })).toBe('same');
    expect(refusalReason(admin, target(C, 'admin'), { kind: 'role', to: 'admin' })).toBe('same');
  });

  it('says "outside your authority" when an operator reaches for staff or a role above member', () => {
    expect(refusalReason(operator, target(C, 'guest'), { kind: 'role', to: 'operator' })).toBe(
      'authority',
    );
    expect(refusalReason(operator, target(C, 'member'), { kind: 'role', to: 'admin' })).toBe(
      'authority',
    );
    expect(refusalReason(operator, target(D, 'admin'), { kind: 'role', to: 'member' })).toBe(
      'authority',
    );
    expect(refusalReason(operator, target(C, 'operator'), { kind: 'role', to: 'guest' })).toBe(
      'authority',
    );
    // An operator's own row too: they cannot change themselves.
    expect(refusalReason(operator, target(A, 'operator'), { kind: 'role', to: 'member' })).toBe(
      'authority',
    );
  });

  it('says "yourself" when somebody blocks or unblocks themselves, whatever their role', () => {
    for (const blocked of [true, false]) {
      expect(refusalReason(admin, target(B, 'admin'), { kind: 'block', blocked })).toBe('self');
      expect(refusalReason(operator, target(A, 'operator'), { kind: 'block', blocked })).toBe(
        'self',
      );
    }
  });

  it('says "outside your authority" when an operator blocks staff or an admin', () => {
    for (const blocked of [true, false]) {
      expect(refusalReason(operator, target(C, 'operator'), { kind: 'block', blocked })).toBe(
        'authority',
      );
      expect(refusalReason(operator, target(D, 'admin'), { kind: 'block', blocked })).toBe(
        'authority',
      );
    }
  });

  it('gives a reason for every person that planRoleChange and planBlock refuse', () => {
    const everyone = ROLE_ORDER.map((role, i) =>
      target(`5eed0000-0000-4000-8000-0000000001${i}0`, role),
    );
    for (const actor of [operator, admin]) {
      for (const to of ROLE_ORDER) {
        const plan = planRoleChange(actor, everyone, to, []);
        if (plan.ok || plan.error !== 'refused') continue;
        for (const id of plan.refused) {
          const who = everyone.find((t) => t.id === id)!;
          expect(refusalReason(actor, who, { kind: 'role', to }), `${actor.role} ${to}`).toMatch(
            /^(same|authority)$/,
          );
        }
      }
    }
  });
});

describe('groupRefusals', () => {
  it('puts people with the same reason in one group, groups in a fixed order', () => {
    expect(
      groupRefusals([
        { reason: 'same', name: '이회원' },
        { reason: 'authority', name: '최관리' },
        { reason: 'same', name: '김가입' },
        { reason: 'self', name: '박운영' },
        { reason: 'authority', name: '정관리자' },
      ]),
    ).toEqual([
      { reason: 'authority', names: ['최관리', '정관리자'], more: 0 },
      { reason: 'self', names: ['박운영'], more: 0 },
      { reason: 'same', names: ['이회원', '김가입'], more: 0 },
    ]);
  });

  it('leaves out a reason nobody has, and has nothing for nobody', () => {
    expect(groupRefusals([{ reason: 'same', name: 'a' }]).map((g) => g.reason)).toEqual(['same']);
    expect(groupRefusals([])).toEqual([]);
  });

  it('lists at most ten names per group and counts the rest', () => {
    const crowd = Array.from({ length: REFUSED_NAMES_SHOWN + 3 }, (_, i) => ({
      reason: 'authority' as const,
      name: `n${i}`,
    }));
    const [group] = groupRefusals([...crowd, { reason: 'same', name: 'x' }]);
    expect(group.names).toHaveLength(REFUSED_NAMES_SHOWN);
    expect(group.names[0]).toBe('n0');
    expect(group.more).toBe(3);
  });
});

describe('cleanIds', () => {
  it('keeps a list of account ids, each once', () => {
    expect(cleanIds([A, B, A])).toEqual([A, B]);
  });

  it('refuses a list with anything in it that is not an id', () => {
    expect(cleanIds([A, 'not-an-id'])).toBeNull();
    expect(cleanIds([A, new File([''], 'x')])).toBeNull();
    expect(cleanIds([A, "x'; drop table user_roles; --"])).toBeNull();
    expect(cleanIds([`${A},${B}`])).toBeNull();
  });

  it('refuses an empty list and one longer than a page', () => {
    expect(cleanIds([])).toBeNull();
    const many = Array.from(
      { length: MEMBERS_BATCH_MAX + 1 },
      (_, i) => `5eed0000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    );
    expect(cleanIds(many)).toBeNull();
    expect(cleanIds(many.slice(0, MEMBERS_BATCH_MAX))).toHaveLength(MEMBERS_BATCH_MAX);
  });

  it('counts the same id in another case as the same person', () => {
    expect(cleanIds([A, A.toUpperCase()])).toEqual([A]);
  });
});

describe('readMemberForm', () => {
  function form(entries: [string, string][]): FormData {
    const data = new FormData();
    for (const [name, value] of entries) data.append(name, value);
    return data;
  }

  it('reads a role button', () => {
    expect(
      readMemberForm(
        form([
          ['locale', 'ko'],
          ['id', A],
          ['id', B],
          ['to', 'member'],
        ]),
      ),
    ).toEqual({
      locale: 'ko',
      ids: [A, B],
      change: { kind: 'role', to: 'member' },
      confirmed: false,
      cancelled: false,
    });
  });

  it('knows a second yes from the confirm button, and a cancel', () => {
    const asked = readMemberForm(
      form([
        ['id', A],
        ['to', 'admin'],
        ['confirm', '1'],
      ]),
    );
    expect(asked).toMatchObject({ change: { kind: 'role', to: 'admin' }, confirmed: true });
    // Anything but the exact value is no yes.
    for (const value of ['', '0', 'true', 'yes']) {
      expect(
        readMemberForm(
          form([
            ['id', A],
            ['to', 'admin'],
            ['confirm', value],
          ]),
        ).confirmed,
        value,
      ).toBe(false);
    }
    expect(
      readMemberForm(
        form([
          ['id', A],
          ['cancel', '1'],
        ]),
      ).cancelled,
    ).toBe(true);
    expect(readMemberForm(form([['id', A]])).cancelled).toBe(false);
  });

  it('reads the block and unblock buttons', () => {
    expect(
      readMemberForm(
        form([
          ['id', A],
          ['blocked', 'true'],
        ]),
      ).change,
    ).toEqual({
      kind: 'block',
      blocked: true,
    });
    expect(
      readMemberForm(
        form([
          ['id', A],
          ['blocked', 'false'],
        ]),
      ).change,
    ).toEqual({
      kind: 'block',
      blocked: false,
    });
  });

  it('finds no change in a form with both kinds of button, with neither, or with a bad value', () => {
    expect(
      readMemberForm(
        form([
          ['id', A],
          ['to', 'member'],
          ['blocked', 'true'],
        ]),
      ).change,
    ).toBeNull();
    expect(readMemberForm(form([['id', A]])).change).toBeNull();
    expect(
      readMemberForm(
        form([
          ['id', A],
          ['to', 'root'],
        ]),
      ).change,
    ).toBeNull();
    expect(
      readMemberForm(
        form([
          ['id', A],
          ['to', ''],
        ]),
      ).change,
    ).toBeNull();
    expect(
      readMemberForm(
        form([
          ['id', A],
          ['blocked', 'yes'],
        ]),
      ).change,
    ).toBeNull();
    expect(
      readMemberForm(
        form([
          ['id', A],
          ['blocked', ''],
        ]),
      ).change,
    ).toBeNull();
  });

  it('reads an operator or admin button as asked: the server is the one that refuses it', () => {
    expect(
      readMemberForm(
        form([
          ['id', A],
          ['to', 'operator'],
        ]),
      ).change,
    ).toEqual({
      kind: 'role',
      to: 'operator',
    });
    expect(
      readMemberForm(
        form([
          ['id', A],
          ['to', 'admin'],
        ]),
      ).change,
    ).toEqual({
      kind: 'role',
      to: 'admin',
    });
  });

  it('gives an empty language when there is none', () => {
    expect(readMemberForm(form([['id', A]])).locale).toBe('');
  });
});
