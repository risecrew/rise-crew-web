import type { Locale } from '@/i18n/locales';

export type PagePath = '' | '/about' | '/network' | '/contact' | '/join';
export const PAGE_PATHS: readonly PagePath[] = ['', '/about', '/network', '/contact', '/join'];

export function localizedAlternates(locale: Locale, path: PagePath) {
  return {
    canonical: `/${locale}${path}`,
    languages: { ko: `/ko${path}`, en: `/en${path}`, 'x-default': `/ko${path}` },
  };
}
