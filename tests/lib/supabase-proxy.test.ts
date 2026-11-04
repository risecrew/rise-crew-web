import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn() }));

import { createServerClient } from '@supabase/ssr';
import { refreshSession } from '@/lib/supabase/proxy';

type CookieMethods = {
  getAll: () => { name: string; value: string }[];
  setAll: (
    cookies: { name: string; value: string; options: Record<string, unknown> }[],
    headers: Record<string, string>,
  ) => void;
};

const NO_STORE = 'private, no-cache, no-store, must-revalidate, max-age=0';

// Replaces the Supabase client with one whose getClaims() runs `onGetClaims`, and returns the
// cookie methods the proxy handed to createServerClient.
function fakeSupabase(onGetClaims: (cookies: CookieMethods) => Promise<unknown> | unknown) {
  const getClaims = vi.fn();
  let cookies: CookieMethods | undefined;
  vi.mocked(createServerClient).mockImplementation(((
    _url: string,
    _key: string,
    options: { cookies: CookieMethods },
  ) => {
    cookies = options.cookies;
    getClaims.mockImplementation(async () => onGetClaims(options.cookies));
    return { auth: { getClaims } };
  }) as unknown as typeof createServerClient);
  return { getClaims, cookies: () => cookies };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
});

describe('refreshSession', () => {
  it('reads the session from the request cookies and calls getClaims once', async () => {
    const fake = fakeSupabase(() => ({ data: null, error: null }));
    const request = new NextRequest('http://localhost:3000/ko', {
      headers: { cookie: 'sb-access-token=abc; theme=dark' },
    });
    const response = NextResponse.next();

    const result = await refreshSession(request, response);

    expect(result).toBe(response);
    expect(fake.getClaims).toHaveBeenCalledTimes(1);
    expect(fake.cookies()?.getAll()).toEqual([
      { name: 'sb-access-token', value: 'abc' },
      { name: 'theme', value: 'dark' },
    ]);
  });

  it('writes refreshed cookies and the cache headers onto the response', async () => {
    fakeSupabase(async ({ setAll }) => {
      setAll(
        [
          { name: 'sb-access-token', value: 'new-token', options: { path: '/', httpOnly: true } },
          { name: 'sb-refresh-token', value: 'new-refresh', options: { path: '/', maxAge: 400 } },
        ],
        { 'Cache-Control': NO_STORE, Expires: '0', Pragma: 'no-cache' },
      );
      return { data: null, error: null };
    });
    const request = new NextRequest('http://localhost:3000/ko', {
      headers: { cookie: 'sb-access-token=old' },
    });
    const response = NextResponse.next();

    await refreshSession(request, response);

    expect(response.cookies.get('sb-access-token')?.value).toBe('new-token');
    expect(response.cookies.get('sb-refresh-token')?.value).toBe('new-refresh');
    expect(response.headers.get('cache-control')).toBe(NO_STORE);
    expect(response.headers.get('expires')).toBe('0');
    expect(response.headers.get('pragma')).toBe('no-cache');
    // Later code in the same request sees the new token too.
    expect(request.cookies.get('sb-access-token')?.value).toBe('new-token');
  });

  it('leaves the response alone when nothing was refreshed', async () => {
    fakeSupabase(() => ({ data: null, error: null }));
    const response = NextResponse.next();

    await refreshSession(new NextRequest('http://localhost:3000/ko'), response);

    expect(response.headers.get('cache-control')).toBeNull();
    expect(response.cookies.getAll()).toEqual([]);
  });

  it('still returns the response when Supabase cannot be reached', async () => {
    fakeSupabase(() => {
      throw new Error('network down');
    });
    const response = NextResponse.next();

    await expect(
      refreshSession(new NextRequest('http://localhost:3000/ko'), response),
    ).resolves.toBe(response);
  });
});
