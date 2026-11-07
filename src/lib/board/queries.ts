import 'server-only';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { atLeast } from '@/lib/auth/roles';
import { getViewer } from '@/lib/auth/viewer';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { readAttachments, type Attachment } from './forms';
import type { Database } from '@/lib/supabase/database.types';
import { isUuid } from '@/lib/teams/query';

export type Activity = Database['public']['Tables']['activities']['Row'];
export type Notice = Database['public']['Tables']['notices']['Row'];

// Both lists are short and grow by a few rows a month, so they have no paging yet.

// Newest first, undated ones last. In the application, not the query: a date may be a year, a month
// or a day, and only text order puts `2026` before `2026-01`.
export function sortActivities(rows: Activity[]): Activity[] {
  return [...rows].sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    return a.date ? -1 : b.date ? 1 : 0;
  });
}

export async function getActivities(): Promise<Activity[]> {
  // In a fixed order first, so activities with the same date do not swap places between visits.
  const { data, error } = await createSupabasePublicClient()
    .from('activities')
    .select('*')
    .order('created_at')
    .order('id');
  if (error) throw new Error(error.message);
  return sortActivities(data);
}

export async function getActivity(id: string): Promise<Activity | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await createSupabasePublicClient()
    .from('activities')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Notices are read with the visitor's own session, so the database decides who sees them.
export async function getNotices(): Promise<Notice[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Shared within one request, so the metadata and the page do not query twice.
export const getNotice = cache(async (id: string): Promise<Notice | null> => {
  if (!isUuid(id)) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('notices').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
});

// How long an address to a notice's photo or file works. Storage issues one only to someone allowed
// to read the file; someone who could read it may have kept a copy anyway, so a short life is about
// addresses being passed on.
const SIGNED_SECONDS = 600;

export type SignedAttachment = Attachment & { url: string };

// Addresses to what a notice carries. A file that cannot be signed is left out rather than breaking
// the page. Files download under their own name.
export async function signNoticeFiles(
  notice: Pick<Notice, 'photo_paths' | 'attachments'>,
): Promise<{ photos: { path: string; url: string }[]; files: SignedAttachment[] }> {
  const bucket = (await createSupabaseServerClient()).storage.from('notice-files');
  const [photos, files] = await Promise.all([
    notice.photo_paths.length > 0
      ? bucket.createSignedUrls(notice.photo_paths, SIGNED_SECONDS)
      : Promise.resolve({ data: [] }),
    Promise.all(
      readAttachments(notice.attachments).map(async (file) => {
        const { data } = await bucket.createSignedUrl(file.path, SIGNED_SECONDS, {
          download: file.name,
        });
        return data ? { ...file, url: data.signedUrl } : null;
      }),
    ),
  ]);
  return {
    photos: (photos.data ?? []).flatMap((photo) =>
      photo.path && photo.signedUrl ? [{ path: photo.path, url: photo.signedUrl }] : [],
    ),
    files: files.filter((file) => file !== null),
  };
}

// For the notice pages: anyone not approved gets a 404, as if notices did not exist.
export async function requireNoticeReader(): Promise<void> {
  const viewer = await getViewer();
  if (!viewer || viewer.blocked || !viewer.onboarded || !atLeast(viewer.role, 'guest')) notFound();
}
