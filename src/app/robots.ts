import type { MetadataRoute } from 'next';
import { getSiteUrl, isLaunched } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: isLaunched() ? { userAgent: '*', allow: '/' } : { userAgent: '*', disallow: '/' },
    sitemap: new URL('/sitemap.xml', getSiteUrl()).toString(),
  };
}
