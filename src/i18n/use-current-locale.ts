'use client';

import { useLocale } from 'next-intl';
import { defaultLocale, isLocale, type Locale } from './locales';

// next-intl types the locale as a plain string; this narrows it for client components.
export function useCurrentLocale(): Locale {
  const locale = useLocale();
  return isLocale(locale) ? locale : defaultLocale;
}
