import type { Locale } from '@/i18n/locales';

export type PagePath = '' | '/about' | '/network' | '/contact' | '/join';
export const PAGE_PATHS: readonly PagePath[] = ['', '/about', '/network', '/contact', '/join'];

// Pages that are not in the sitemap (yet). The privacy policy opens only once accounts are
// switched on, and is listed with the other pages after that.
export type UnlistedPath = '/privacy';

export function localizedAlternates(locale: Locale, path: PagePath | UnlistedPath) {
  return {
    canonical: `/${locale}${path}`,
    languages: { ko: `/ko${path}`, en: `/en${path}`, 'x-default': `/ko${path}` },
  };
}
