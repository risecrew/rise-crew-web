import 'server-only';
import { cache } from 'react';
import { atLeast } from '@/lib/auth/roles';
import type { Viewer } from '@/lib/auth/viewer';
import { getSupabasePublicConfig } from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { TeamLink, TeamPostVisibility } from './forms';
import { TEAM_LIMITS } from './forms';
import type { TeamsQuery } from './query';

// Every read goes through the visitor's own session, so the database's row level security decides
// what comes back. Nothing here checks who may see what, and nothing here uses the secret key.

const TEAM_COLUMNS =
  'id, slug, name, cohort, tagline, intro, logo_path, cover_path, links, is_published';
// author_id is left out on purpose: the database refuses to show it to anyone.
const POST_COLUMNS =
  'id, team_id, title, body, visibility, photo_paths, hidden_at, created_at, edited_at';

export type Team = {
  id: string;
  slug: string;
  name: string;
  cohort: number;
  tagline: string;
  intro: string;
  logo_path: string | null;
  cover_path: string | null;
  links: TeamLink[];
  is_published: boolean;
};
export type TeamCard = Pick<
  Team,
  'id' | 'slug' | 'name' | 'cohort' | 'tagline' | 'logo_path' | 'cover_path'
> & { cover: string | null };

export type Post = {
  id: string;
  team_id: string;
  title: string;
  body: string;
  visibility: TeamPostVisibility;
  photo_paths: string[];
  hidden_at: string | null;
  created_at: string;
  edited_at: string | null;
};

// A post in a list, with an address for its first photo.
export type ListedPost = Post & { thumbnail: string | null };

// A page past the end comes back from the Data API as this error. It is an empty page, not a fault.
const PAGE_OUT_OF_RANGE = 'PGRST103';

function pageRange(page: number): [number, number] {
  const from = (page - 1) * TEAM_LIMITS.pageSize;
  return [from, from + TEAM_LIMITS.pageSize - 1];
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / TEAM_LIMITS.pageSize));
}

// The list is the public face of the teams, so a team's own members and operators see the same
// list as everyone else: an unpublished team is reached by its address or the admin screen.
export async function listTeams(
  q: TeamsQuery,
): Promise<{ teams: TeamCard[]; cohorts: number[]; total: number }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('teams')
    .select('id, slug, name, cohort, tagline, logo_path, cover_path', { count: 'exact' })
    .eq('is_published', true);
  if (q.cohort) query = query.eq('cohort', q.cohort);

  const [list, cohortRows] = await Promise.all([
    query
      .order('cohort', { ascending: false })
      .order('name')
      .range(...pageRange(q.page)),
    supabase.from('teams').select('cohort').eq('is_published', true),
  ]);
  if (cohortRows.error) throw new Error(cohortRows.error.message);
  if (list.error && list.error.code !== PAGE_OUT_OF_RANGE) throw new Error(list.error.message);

  const cohorts = [...new Set((cohortRows.data ?? []).map((row) => row.cohort))].sort(
    (a, b) => b - a,
  );
  const rows = list.error ? [] : (list.data as Omit<TeamCard, 'cover'>[]);
  return {
    teams: await withCovers(rows),
    cohorts,
    total: list.count ?? 0,
  };
}

// The cover of each team in a list, by the same rule as a team's page. One query for the whole
// list, newest first, keeping the first photo found for each team.
async function withCovers(rows: Omit<TeamCard, 'cover'>[]): Promise<TeamCard[]> {
  const needing = rows.filter((team) => !team.cover_path).map((team) => team.id);
  const photoOf = new Map<string, string>();
  if (needing.length > 0) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('team_posts')
      .select('team_id, photo_paths')
      .in('team_id', needing)
      .eq('visibility', 'public')
      .is('hidden_at', null)
      .not('photo_paths', 'eq', '{}')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    for (const post of data) {
      if (!photoOf.has(post.team_id)) photoOf.set(post.team_id, post.photo_paths[0]);
    }
  }
  const signed = await signPhotoPairs([...photoOf.values()]);
  const urlOf = new Map(signed.map((photo) => [photo.path, photo.url]));
  return rows.map((team) => {
    const path = photoOf.get(team.id);
    return {
      ...team,
      cover: team.cover_path
        ? publicCoverUrl(team.cover_path)
        : path
          ? (urlOf.get(path) ?? null)
          : null,
    };
  });
}

function publicCoverUrl(path: string): string {
  return `${getSupabasePublicConfig().url}/storage/v1/object/public/team-covers/${path}`;
}

// The picture on a shared link. It must outlast the link, so only the team's own public files count,
// never a post photo, whose address expires. Next.js falls back to the site's image without one.
export function teamShareImage(team: Pick<Team, 'cover_path' | 'logo_path'>): string | undefined {
  if (team.cover_path) return publicCoverUrl(team.cover_path);
  return logoUrl(team.logo_path) ?? undefined;
}

// Shared within one request, so the metadata and the page do not query twice.
export const getTeamBySlug = cache(async (slug: string): Promise<Team | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('teams')
    .select(TEAM_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Team | null;
});

// What the visitor may do on a team's page. This only decides which buttons to show; the database
// checks every write again.
export async function getTeamAccess(
  team: Pick<Team, 'id'>,
  viewer: Viewer | null,
): Promise<{ isMember: boolean; isStaff: boolean }> {
  if (!viewer || viewer.blocked) return { isMember: false, isStaff: false };
  const isStaff = atLeast(viewer.role, 'operator');
  if (!atLeast(viewer.role, 'member')) return { isMember: false, isStaff };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('team_id', team.id)
    .eq('user_id', viewer.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { isMember: data !== null, isStaff };
}

// The teams the visitor belongs to, for My page. The database answers only with the visitor's own
// rows, and only with teams they can currently see: someone demoted out of a team that is not
// published no longer gets it back.
export async function listMyTeams(viewer: Viewer): Promise<{ slug: string; name: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('team_members')
    .select('teams(slug, name)')
    .eq('user_id', viewer.id);
  if (error) throw new Error(error.message);
  return data
    .flatMap((row) => (row.teams ? [row.teams] : []))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// One page of the posts this visitor may read, newest first, and how many signed-in posts they
// cannot read yet (asked only when `countLocked`, for a visitor who is not a finished account).
export async function listPosts(
  teamId: string,
  page: number,
  countLocked: boolean,
): Promise<{ posts: ListedPost[]; total: number; lockedCount: number }> {
  const supabase = await createSupabaseServerClient();
  const [list, locked] = await Promise.all([
    supabase
      .from('team_posts')
      .select(POST_COLUMNS, { count: 'exact' })
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .order('id')
      .range(...pageRange(page)),
    countLocked
      ? supabase.rpc('team_signed_in_post_count', { team: teamId })
      : Promise.resolve({ data: 0, error: null }),
  ]);
  if (list.error && list.error.code !== PAGE_OUT_OF_RANGE) throw new Error(list.error.message);
  if (locked.error) throw new Error(locked.error.message);
  const rows = list.error ? [] : (list.data as Post[]);
  const signed = await signPhotoPairs(rows.flatMap((post) => post.photo_paths.slice(0, 1)));
  const urlOf = new Map(signed.map((photo) => [photo.path, photo.url]));
  return {
    posts: rows.map((post) => ({
      ...post,
      thumbnail: post.photo_paths[0] ? (urlOf.get(post.photo_paths[0]) ?? null) : null,
    })),
    total: list.count ?? 0,
    lockedCount: locked.data ?? 0,
  };
}

export const getPost = cache(async (teamId: string, id: string): Promise<Post | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('team_posts')
    .select(POST_COLUMNS)
    .eq('id', id)
    .eq('team_id', teamId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Post | null;
});

// Addresses for a post's photos that last 10 minutes, in the same order. Storage issues them only
// if the visitor can read the file, and a photo it refuses is left out.
export async function signPhotos(paths: string[]): Promise<string[]> {
  if (paths.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from('team-post-photos')
    .createSignedUrls(paths, 600);
  if (error) throw new Error(error.message);
  return data.flatMap((item) => (item.signedUrl ? [item.signedUrl] : []));
}

// The same, keeping which path each address is for: the edit form needs the paths to save them back.
export async function signPhotoPairs(
  paths: string[],
): Promise<{ path: string; url: string | null }[]> {
  if (paths.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from('team-post-photos')
    .createSignedUrls(paths, 600);
  if (error) throw new Error(error.message);
  return paths.map((path) => ({
    path,
    url: data.find((item) => item.path === path)?.signedUrl ?? null,
  }));
}

// The photo that opens a team's page: the cover the team chose, or else the first photo of its
// latest public post, as a 10-minute address. Only a public post counts, so everyone sees the same
// cover, and a post's photo leaves the cover when the post is hidden or closed.
export async function getTeamCover(team: Pick<Team, 'id' | 'cover_path'>): Promise<string | null> {
  if (team.cover_path) {
    return publicCoverUrl(team.cover_path);
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('team_posts')
    .select('photo_paths')
    .eq('team_id', team.id)
    .eq('visibility', 'public')
    .is('hidden_at', null)
    .not('photo_paths', 'eq', '{}')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const [url] = await signPhotos(data.photo_paths.slice(0, 1));
  return url ?? null;
}

// Logos are in a public bucket, so the address is known without asking anyone.
export function logoUrl(path: string | null): string | null {
  if (!path) return null;
  return `${getSupabasePublicConfig().url}/storage/v1/object/public/team-logos/${path}`;
}
