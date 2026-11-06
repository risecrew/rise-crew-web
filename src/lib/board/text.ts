import type { Localized, TimelineEvent } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { getSupabasePublicConfig } from '@/lib/supabase/env';
import type { Attachment } from './forms';

// English is optional. Where there is none, the English pages show the Korean.
export function localized(ko: string, en: string, locale: Locale): string {
  return locale === 'en' && en !== '' ? en : ko;
}

// True when the text on screen is Korean on an English page, so it can say so with `lang`.
export function showsFallback(en: string, locale: Locale): boolean {
  return locale === 'en' && en === '';
}

function both(ko: string, en: string): Localized {
  return { ko, en: en === '' ? ko : en };
}

// A file in the bucket, rather than a photo that ships with the site under /images/. Only a file in
// the bucket is ours to remove.
export function isUploadedPhoto(photo: string | null): photo is string {
  return photo !== null && !photo.startsWith('/');
}

export function activityPhotoSrc(photo: string): string {
  if (!isUploadedPhoto(photo)) return photo;
  return `${getSupabasePublicConfig().url}/storage/v1/object/public/activity-photos/${photo}`;
}

function noticeFileUrl(path: string): string {
  return `${getSupabasePublicConfig().url}/storage/v1/object/public/notice-files/${path}`;
}

export const noticePhotoSrc = noticeFileUrl;

// Storage sends the file as a download under this name, rather than opening it in the site's place.
export function noticeFileDownload(file: Attachment): string {
  return `${noticeFileUrl(file.path)}?download=${encodeURIComponent(file.name)}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type TimelineRow = {
  id: string;
  date: string | null;
  title_ko: string;
  title_en: string;
  city_ko: string;
  city_en: string;
  is_planned: boolean;
};

// The activities as the /about history shows them: oldest first, undated ones last.
export function activityTimeline(rows: TimelineRow[]): TimelineEvent[] {
  return [...rows]
    .sort((a, b) => {
      if (a.date && b.date) return a.date.localeCompare(b.date);
      return a.date ? -1 : b.date ? 1 : 0;
    })
    .map((row) => ({
      id: row.id,
      ...(row.date ? { date: row.date } : {}),
      title: both(row.title_ko, row.title_en),
      city: both(row.city_ko, row.city_en),
      status: row.is_planned ? ('planned' as const) : ('done' as const),
      evidence: [],
    }));
}
