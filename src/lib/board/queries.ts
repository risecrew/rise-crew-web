import 'server-only';
import { cache } from 'react';
import { createSupabasePublicClient } from '@/lib/supabase/public';
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

export async function getNotices(): Promise<Notice[]> {
  const { data, error } = await createSupabasePublicClient()
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
  const { data, error } = await createSupabasePublicClient()
    .from('notices')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
});
