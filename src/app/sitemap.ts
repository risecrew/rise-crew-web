import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/locales';
import { PAGE_PATHS } from '@/lib/metadata';
import { getSiteUrl } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  return PAGE_PATHS.flatMap((path) =>
    locales.map((locale) => ({
      url: new URL(`/${locale}${path}`, base).toString(),
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, new URL(`/${l}${path}`, base).toString()]),
        ),
      },
    })),
  );
}
