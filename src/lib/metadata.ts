import type { Locale } from '@/i18n/locales';

export type PagePath = '' | '/about' | '/program' | '/network' | '/join';
export const PAGE_PATHS: readonly PagePath[] = ['', '/about', '/program', '/network', '/join'];

// Pages that are not in the sitemap (yet). The privacy policy and the team pages open only once
// accounts are switched on, and are listed with the other pages after that.
export type UnlistedPath =
  '/privacy' | '/startups' | '/activities' | `/startups/${string}` | `/activities/${string}`;

export function localizedAlternates(locale: Locale, path: PagePath | UnlistedPath) {
  return {
    canonical: `/${locale}${path}`,
    languages: { ko: `/ko${path}`, en: `/en${path}`, 'x-default': `/ko${path}` },
  };
}
