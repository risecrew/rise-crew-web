import { describe, expect, it } from 'vitest';
import { safeNext } from '@/lib/auth/redirect';

describe('safeNext', () => {
  it('keeps a path inside the current locale', () => {
    expect(safeNext('/ko/me', 'ko')).toBe('/ko/me');
    expect(safeNext('/ko', 'ko')).toBe('/ko');
  });

  it('falls back to the locale home when there is nothing to follow', () => {
    expect(safeNext(null, 'ko')).toBe('/ko');
    expect(safeNext(undefined, 'en')).toBe('/en');
    expect(safeNext('', 'ko')).toBe('/ko');
  });

  it('refuses addresses that leave the site', () => {
    for (const next of [
      '//evil.example',
      '///evil.example',
      'https://evil.example',
      'http://evil.example/ko/me',
      '/\\evil',
      '/ko\\..\\evil',
      'javascript:alert(1)',
      '/\t/evil.example',
      '/\n/evil.example',
      '/ko/\r\nSet-Cookie: a=b',
      '/%2F/evil.example',
    ]) {
      expect(safeNext(next, 'ko')).toBe('/ko');
    }
  });

  it('refuses other locales and relative paths', () => {
    expect(safeNext('/fr/me', 'ko')).toBe('/ko');
    expect(safeNext('/en/me', 'ko')).toBe('/ko');
    expect(safeNext('/korea', 'ko')).toBe('/ko');
    expect(safeNext('me', 'ko')).toBe('/ko');
    expect(safeNext('./me', 'ko')).toBe('/ko');
  });

  it('refuses a path that climbs out of the locale', () => {
    expect(safeNext('/ko/../fr/me', 'ko')).toBe('/ko');
    expect(safeNext('/ko/%2e%2e/fr/me', 'ko')).toBe('/ko');
  });

  it('refuses an absurdly long value', () => {
    expect(safeNext(`/ko/${'a'.repeat(3000)}`, 'ko')).toBe('/ko');
  });

  it('keeps the query string and the hash', () => {
    expect(safeNext('/en/about?x=1#y', 'en')).toBe('/en/about?x=1#y');
  });
});
