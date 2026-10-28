import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], delete: vi.fn() })),
}));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => (key === 'word' ? '탈퇴' : key)),
}));
vi.mock('@/lib/auth/config', () => ({ isAuthEnabled: vi.fn(() => true) }));
vi.mock('@/lib/auth/viewer', () => ({ getViewer: vi.fn(), requireViewer: vi.fn() }));
vi.mock('@/lib/auth/last-admin', () => ({ wouldLeaveNoAdmin: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));

import { deleteAccount } from '@/app/[locale]/me/actions';
import { wouldLeaveNoAdmin } from '@/lib/auth/last-admin';
import { getViewer, requireViewer, type Viewer } from '@/lib/auth/viewer';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const ME = '5eed0000-0000-4000-8000-000000000001';

function signedInAs(role: Viewer['role']) {
  const viewer = { id: ME, role, blocked: false, onboarded: true } as Viewer;
  vi.mocked(getViewer).mockResolvedValue(viewer);
  vi.mocked(requireViewer).mockResolvedValue(viewer);
}

function fakeClients() {
  const deleteUser = vi.fn(async () => ({ error: null }));
  vi.mocked(createSupabaseAdminClient).mockReturnValue({
    auth: { admin: { deleteUser } },
  } as unknown as ReturnType<typeof createSupabaseAdminClient>);
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: { signOut: vi.fn(async () => ({ error: null })) },
  } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
  return { deleteUser };
}

function form(word: string) {
  const data = new FormData();
  data.set('confirm', word);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('deleteAccount and the last admin', () => {
  it('keeps the last admin who can sign in, even when they typed the word', async () => {
    const { deleteUser } = fakeClients();
    signedInAs('admin');
    vi.mocked(wouldLeaveNoAdmin).mockResolvedValue(true);

    const result = await deleteAccount('ko', form('탈퇴'));

    expect(result).toMatchObject({ error: 'lastAdmin', typed: '탈퇴' });
    expect(wouldLeaveNoAdmin).toHaveBeenCalledWith([ME]);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('deletes an admin while another stays', async () => {
    const { deleteUser } = fakeClients();
    signedInAs('admin');
    vi.mocked(wouldLeaveNoAdmin).mockResolvedValue(false);

    await expect(deleteAccount('ko', form('탈퇴'))).rejects.toThrow('NEXT_REDIRECT /ko?deleted=1');
    expect(deleteUser).toHaveBeenCalledWith(ME);
  });

  it('deletes anyone else as before', async () => {
    const { deleteUser } = fakeClients();
    signedInAs('member');
    vi.mocked(wouldLeaveNoAdmin).mockResolvedValue(false);

    await expect(deleteAccount('ko', form(' 탈퇴 '))).rejects.toThrow(
      'NEXT_REDIRECT /ko?deleted=1',
    );
    expect(deleteUser).toHaveBeenCalledWith(ME);
  });

  it('keeps the account when it cannot find out whether it is the last admin', async () => {
    const { deleteUser } = fakeClients();
    signedInAs('admin');
    vi.mocked(wouldLeaveNoAdmin).mockRejectedValue(new Error('down'));

    expect(await deleteAccount('ko', form('탈퇴'))).toMatchObject({ error: 'failed' });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('asks for the word before anything else', async () => {
    const { deleteUser } = fakeClients();
    signedInAs('admin');

    expect(await deleteAccount('ko', form('아니요'))).toMatchObject({ error: 'confirm' });
    expect(wouldLeaveNoAdmin).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });
});
