import { describe, expect, it } from 'vitest';
import { localizedAlternates, PAGE_PATHS } from '@/lib/metadata';
import { getSiteUrl, isLaunched } from '@/lib/site';

describe('localizedAlternates', () => {
  it('builds canonical and language alternates', () => {
    expect(localizedAlternates('en', '/about')).toEqual({
      canonical: '/en/about',
      languages: { ko: '/ko/about', en: '/en/about', 'x-default': '/ko/about' },
    });
  });
  it('handles the home path', () => {
    expect(localizedAlternates('ko', '').canonical).toBe('/ko');
  });
  it('lists the five public pages', () => {
    expect(PAGE_PATHS).toEqual(['', '/about', '/network', '/contact', '/join']);
  });
});

describe('getSiteUrl', () => {
  it('prefers NEXT_PUBLIC_SITE_URL', () => {
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://risecrew.kr' }).origin).toBe(
      'https://risecrew.kr',
    );
  });
  it('falls back to the Vercel production host', () => {
    expect(getSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'rise-crew-web.vercel.app' }).origin).toBe(
      'https://rise-crew-web.vercel.app',
    );
  });
  it('falls back to localhost', () => {
    expect(getSiteUrl({}).origin).toBe('http://localhost:3000');
  });
});

describe('isLaunched', () => {
  // The *.vercel.app address is temporary; search engines stay out until the real domain.
  it('is false on the temporary Vercel address', () => {
    expect(isLaunched({ VERCEL_PROJECT_PRODUCTION_URL: 'rise-crew-web.vercel.app' })).toBe(false);
    expect(isLaunched({})).toBe(false);
  });
  it('is true once the real domain is configured', () => {
    expect(isLaunched({ NEXT_PUBLIC_SITE_URL: 'https://risecrew.kr' })).toBe(true);
  });
  it('ignores a site URL that still points at vercel.app or localhost', () => {
    expect(isLaunched({ NEXT_PUBLIC_SITE_URL: 'https://rise-crew-web.vercel.app' })).toBe(false);
    expect(isLaunched({ NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' })).toBe(false);
  });
});
