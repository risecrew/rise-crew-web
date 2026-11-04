import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }));

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { unblockedAdminIds, wouldLeaveNoAdmin } from '@/lib/auth/last-admin';

const A = '5eed0000-0000-4000-8000-00000000000a';
const B = '5eed0000-0000-4000-8000-00000000000b';
const C = '5eed0000-0000-4000-8000-00000000000c';

type Result = { data: { user_id: string }[] | null; error: { message: string } | null };

// A stand-in for the secret-key client: just the query last-admin.ts makes, recording its filters.
function fakeAdmin(result: Result) {
  const calls: { eq: [string, unknown][]; is: [string, unknown][]; table: string } = {
    eq: [],
    is: [],
    table: '',
  };
  const query = {
    eq(column: string, value: unknown) {
      calls.eq.push([column, value]);
      return query;
    },
    is(column: string, value: unknown) {
      calls.is.push([column, value]);
      return Promise.resolve(result);
    },
  };
  vi.mocked(createSupabaseAdminClient).mockReturnValue({
    from: (table: string) => {
      calls.table = table;
      return { select: () => query };
    },
  } as unknown as ReturnType<typeof createSupabaseAdminClient>);
  return calls;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('unblockedAdminIds', () => {
  it('asks for the admins whose block date is empty', async () => {
    const calls = fakeAdmin({ data: [{ user_id: A }, { user_id: B }], error: null });
    expect(await unblockedAdminIds()).toEqual([A, B]);
    expect(calls).toEqual({
      table: 'user_roles',
      eq: [['role', 'admin']],
      is: [['blocked_at', null]],
    });
  });

  it('throws when the database cannot be read', async () => {
    fakeAdmin({ data: null, error: { message: 'boom' } });
    await expect(unblockedAdminIds()).rejects.toThrow('boom');
  });
});

describe('wouldLeaveNoAdmin', () => {
  it('is true when the only admin is the one leaving', async () => {
    fakeAdmin({ data: [{ user_id: A }], error: null });
    expect(await wouldLeaveNoAdmin([A])).toBe(true);
  });

  it('is false while another admin stays', async () => {
    fakeAdmin({ data: [{ user_id: A }, { user_id: B }], error: null });
    expect(await wouldLeaveNoAdmin([A])).toBe(false);
  });

  it('is true when every admin is leaving together', async () => {
    fakeAdmin({ data: [{ user_id: A }, { user_id: B }], error: null });
    expect(await wouldLeaveNoAdmin([B, A])).toBe(true);
  });

  it('is false for somebody who is not an admin who can sign in', async () => {
    fakeAdmin({ data: [{ user_id: A }], error: null });
    expect(await wouldLeaveNoAdmin([C])).toBe(false);
  });

  it('throws instead of guessing when the database cannot be read', async () => {
    fakeAdmin({ data: null, error: { message: 'down' } });
    await expect(wouldLeaveNoAdmin([A])).rejects.toThrow('down');
  });
});
