import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock('@/lib/auth/config', () => ({ isAuthEnabled: vi.fn(() => true) }));
vi.mock('@/lib/auth/viewer', () => ({ getViewer: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock('@/lib/teams/queries', () => ({ getTeamBySlug: vi.fn(), getPost: vi.fn() }));

import { createTeam, setPostHidden } from '@/app/[locale]/admin/teams/actions';
import {
  createPost,
  deletePost,
  saveIntro,
  updatePost,
} from '@/app/[locale]/startups/[slug]/actions';
import { isAuthEnabled } from '@/lib/auth/config';
import { getViewer } from '@/lib/auth/viewer';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function form() {
  const data = new FormData();
  data.set('locale', 'ko');
  data.set('slug', 'a-team');
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isAuthEnabled).mockReturnValue(true);
});

describe('team actions with accounts switched off', () => {
  const actions = { saveIntro, createPost, updatePost, deletePost, createTeam, setPostHidden };

  for (const [name, action] of Object.entries(actions)) {
    it(`${name} is a 404 and never touches Supabase`, async () => {
      vi.mocked(isAuthEnabled).mockReturnValue(false);
      await expect(action(null, form())).rejects.toThrow('NEXT_NOT_FOUND');
      expect(getViewer).not.toHaveBeenCalled();
      expect(createSupabaseServerClient).not.toHaveBeenCalled();
    });
  }
});

describe('team actions when the database cannot be read', () => {
  it('come back as a failure, so the form keeps what was typed', async () => {
    vi.mocked(getViewer).mockRejectedValue(new Error('database down'));
    await expect(createPost(null, form())).resolves.toEqual({ ok: false, error: 'failed' });
    await expect(saveIntro(null, form())).resolves.toEqual({ ok: false, error: 'failed' });
  });
});
