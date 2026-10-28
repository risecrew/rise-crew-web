import type { Locale } from '@/i18n/locales';

export type PagePath = '' | '/about' | '/network' | '/contact' | '/join';
export const PAGE_PATHS: readonly PagePath[] = ['', '/about', '/network', '/contact', '/join'];

// Reachable pages that are not in the sitemap (yet). The privacy policy is there to be read and
// reviewed, but is listed with the other pages only once accounts are launched.
export type UnlistedPath = '/privacy';

export function localizedAlternates(locale: Locale, path: PagePath | UnlistedPath) {
  return {
    canonical: `/${locale}${path}`,
    languages: { ko: `/ko${path}`, en: `/en${path}`, 'x-default': `/ko${path}` },
  };
}
