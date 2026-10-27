import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

// Next throws from redirect() and notFound() to stop rendering; the fakes do the same so the
// code under test cannot carry on past them.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));

import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getViewer, requireRole, requireViewer } from '@/lib/auth/viewer';

type Role = 'guest' | 'member' | 'operator' | 'admin';

type QueryResult = { data: unknown; error: { message: string } | null };

const USER_ID = '11111111-1111-4111-8111-111111111111';

type Scenario = {
  claims?: { sub: string; email?: string } | null;
  role?: Role;
  blocked?: boolean;
  onboarded?: boolean;
  profile?: 'present' | 'missing';
  roleRow?: 'present' | 'missing';
};

function profileRow(onboarded: boolean) {
  return {
    id: USER_ID,
    email: 'someone@example.com',
    last_name: '김',
    first_name: '라이즈',
    occupation: 'undergrad',
    school: '성균관대학교',
    major: '경영학',
    affiliation: null,
    recruit_opt_in: false,
    onboarded_at: onboarded ? '2026-10-27T00:00:00Z' : null,
    created_at: '2026-10-27T00:00:00Z',
    updated_at: '2026-10-27T00:00:00Z',
  };
}

// A stand-in for the Supabase client: just the calls viewer.ts makes.
function fakeClient(scenario: Scenario) {
  const {
    claims = { sub: USER_ID, email: 'someone@example.com' },
    role = 'member',
    blocked = false,
    onboarded = true,
    profile = 'present',
    roleRow = 'present',
  } = scenario;

  const rows: Record<string, unknown> = {
    profiles: profile === 'present' ? profileRow(onboarded) : null,
    user_roles:
      roleRow === 'present'
        ? {
            user_id: USER_ID,
            role,
            blocked_at: blocked ? '2026-10-27T01:00:00Z' : null,
          }
        : null,
  };

  const client = {
    auth: {
      getClaims: vi.fn(async () => ({ data: claims ? { claims } : null, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    from: vi.fn((table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async (): Promise<QueryResult> => ({ data: rows[table], error: null }),
        }),
      }),
    })),
  };
  vi.mocked(createSupabaseServerClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
  );
  return client;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getViewer', () => {
  it('returns null when nobody is signed in', async () => {
    fakeClient({ claims: null });
    expect(await getViewer()).toBeNull();
  });

  it('reads the role and block state from the database', async () => {
    fakeClient({ role: 'operator', blocked: true });
    const viewer = await getViewer();
    expect(viewer).toMatchObject({
      id: USER_ID,
      email: 'someone@example.com',
      role: 'operator',
      blocked: true,
      onboarded: true,
    });
    expect(viewer?.profile.last_name).toBe('김');
  });

  it('reports a profile without onboarded_at as not onboarded', async () => {
    fakeClient({ onboarded: false });
    expect((await getViewer())?.onboarded).toBe(false);
  });

  it('treats an account whose rows are gone as signed out', async () => {
    fakeClient({ profile: 'missing' });
    expect(await getViewer()).toBeNull();
    fakeClient({ roleRow: 'missing' });
    expect(await getViewer()).toBeNull();
  });

  it('fails loudly when the database cannot be read', async () => {
    const client = fakeClient({});
    client.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async (): Promise<QueryResult> => ({
            data: null,
            error: { message: 'boom' },
          }),
        }),
      }),
    }));
    await expect(getViewer()).rejects.toThrow('boom');
  });
});

describe('requireViewer', () => {
  it('sends a signed-out visitor to the login page, remembering where they were going', async () => {
    fakeClient({ claims: null });
    await expect(requireViewer('ko', '/ko/me')).rejects.toThrow(
      `NEXT_REDIRECT /ko/login?next=${encodeURIComponent('/ko/me')}`,
    );
    expect(redirect).toHaveBeenCalledWith('/ko/login?next=%2Fko%2Fme');
  });

  it('sends a signed-out visitor to a plain login page when no destination is given', async () => {
    fakeClient({ claims: null });
    await expect(requireViewer('en')).rejects.toThrow('NEXT_REDIRECT /en/login');
  });

  it('does not let a crafted destination through', async () => {
    fakeClient({ claims: null });
    await expect(requireViewer('ko', '//evil.example')).rejects.toThrow(
      `NEXT_REDIRECT /ko/login?next=${encodeURIComponent('/ko')}`,
    );
  });

  it('sends someone who has not finished sign-up to the welcome page', async () => {
    fakeClient({ onboarded: false });
    await expect(requireViewer('ko')).rejects.toThrow('NEXT_REDIRECT /ko/welcome');
    await expect(requireViewer('ko', '/ko/me')).rejects.toThrow(
      `NEXT_REDIRECT /ko/welcome?next=${encodeURIComponent('/ko/me')}`,
    );
  });

  it('signs a blocked account out and sends it to the login page', async () => {
    const client = fakeClient({ blocked: true });
    await expect(requireViewer('ko', '/ko/me')).rejects.toThrow(
      'NEXT_REDIRECT /ko/login?error=blocked',
    );
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('still redirects a blocked account when signing out fails', async () => {
    const client = fakeClient({ blocked: true });
    client.auth.signOut.mockRejectedValueOnce(new Error('network'));
    await expect(requireViewer('en')).rejects.toThrow('NEXT_REDIRECT /en/login?error=blocked');
  });

  it('returns the viewer for an onboarded, unblocked account', async () => {
    fakeClient({ role: 'guest' });
    const viewer = await requireViewer('ko');
    expect(viewer.role).toBe('guest');
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  it('returns the viewer for an onboarded, unblocked operator', async () => {
    fakeClient({ role: 'operator' });
    const viewer = await requireRole('ko', 'operator');
    expect(viewer.id).toBe(USER_ID);
    expect(viewer.role).toBe('operator');
    expect(notFound).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('also lets an admin through an operator-level check', async () => {
    fakeClient({ role: 'admin' });
    expect((await requireRole('ko', 'operator')).role).toBe('admin');
  });

  it('shows a member a 404', async () => {
    fakeClient({ role: 'member' });
    await expect(requireRole('ko', 'operator')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it('shows a blocked operator a 404, even with a still-valid token', async () => {
    fakeClient({ role: 'operator', blocked: true });
    await expect(requireRole('ko', 'operator')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('sends an operator who has not finished sign-up to the welcome page', async () => {
    fakeClient({ role: 'operator', onboarded: false });
    await expect(requireRole('ko', 'operator')).rejects.toThrow('NEXT_REDIRECT /ko/welcome');
    expect(redirect).toHaveBeenCalledWith('/ko/welcome');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('sends a signed-out visitor to the login page rather than a 404', async () => {
    fakeClient({ claims: null });
    await expect(requireRole('ko', 'operator', '/ko/admin/members')).rejects.toThrow(
      `NEXT_REDIRECT /ko/login?next=${encodeURIComponent('/ko/admin/members')}`,
    );
  });
});
