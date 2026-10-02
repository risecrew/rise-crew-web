import { describe, expect, it } from 'vitest';
import { localizedAlternates, PAGE_PATHS } from '@/lib/metadata';
import { getSiteUrl } from '@/lib/site';

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
