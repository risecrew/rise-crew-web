import { describe, expect, it } from 'vitest';
import { isAuthEnabled } from '@/lib/auth/config';

const configured = {
  NEXT_PUBLIC_AUTH_ENABLED: 'true',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x',
};

describe('isAuthEnabled', () => {
  it('is off when nothing is set', () => {
    expect(isAuthEnabled({})).toBe(false);
  });

  it('is off when the switch is on but the Supabase URL and key are missing', () => {
    expect(isAuthEnabled({ NEXT_PUBLIC_AUTH_ENABLED: 'true' })).toBe(false);
  });

  it('is off when only one of the URL and key is set', () => {
    expect(
      isAuthEnabled({
        NEXT_PUBLIC_AUTH_ENABLED: 'true',
        NEXT_PUBLIC_SUPABASE_URL: configured.NEXT_PUBLIC_SUPABASE_URL,
      }),
    ).toBe(false);
    expect(
      isAuthEnabled({
        NEXT_PUBLIC_AUTH_ENABLED: 'true',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: configured.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      }),
    ).toBe(false);
  });

  it('is on when the switch is exactly "true" and the URL and key are set', () => {
    expect(isAuthEnabled(configured)).toBe(true);
  });

  it('is off for any other spelling of the switch', () => {
    for (const value of ['TRUE', '1', 'yes', 'false', '']) {
      expect(isAuthEnabled({ ...configured, NEXT_PUBLIC_AUTH_ENABLED: value })).toBe(false);
    }
  });
});
