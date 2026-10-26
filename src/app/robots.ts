import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    // Crawling stays open even before launch: crawlers must fetch the pages to see their
    // noindex (set in the locale layout until the real domain is configured).
    rules: { userAgent: '*', allow: '/' },
    sitemap: new URL('/sitemap.xml', getSiteUrl()).toString(),
  };
}
