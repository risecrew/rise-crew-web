import { describe, expect, it } from 'vitest';
import { readTokenClaims } from '@/lib/auth/claims';

function token(payload: unknown): string {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${part({ alg: 'HS256', typ: 'JWT' })}.${part(payload)}.signature`;
}

describe('readTokenClaims', () => {
  it('reads the role and the block flag the sign-in hook puts in the token', () => {
    expect(readTokenClaims(token({ sub: 'u', app_role: 'operator', blocked: false }))).toEqual({
      role: 'operator',
      blocked: false,
    });
    expect(readTokenClaims(token({ sub: 'u', app_role: 'member', blocked: true }))).toEqual({
      role: 'member',
      blocked: true,
    });
  });

  it('treats a missing or unknown role as a guest', () => {
    expect(readTokenClaims(token({ sub: 'u' }))).toEqual({ role: 'guest', blocked: false });
    expect(readTokenClaims(token({ app_role: 'superuser' }))?.role).toBe('guest');
    expect(readTokenClaims(token({ app_role: 7 }))?.role).toBe('guest');
  });

  it('counts only a real true as blocked', () => {
    expect(readTokenClaims(token({ blocked: 'false' }))?.blocked).toBe(false);
    expect(readTokenClaims(token({ blocked: 1 }))?.blocked).toBe(false);
    expect(readTokenClaims(token({ blocked: true }))?.blocked).toBe(true);
  });

  it('reads a token whose other claims hold non-ASCII text', () => {
    expect(
      readTokenClaims(token({ user_metadata: { name: '이회원' }, app_role: 'admin' })),
    ).toEqual({ role: 'admin', blocked: false });
  });

  it('gives up on anything that is not a token', () => {
    for (const value of [
      '',
      'abc',
      'a.b',
      'a.!!!.c',
      `a.${Buffer.from('[1]').toString('base64url')}.c`,
    ]) {
      expect(readTokenClaims(value), value).toBeNull();
    }
  });
});
