import { AuthApiError } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

// Next throws from notFound() to stop the handler; the fake does the same, so the code under
// test cannot carry on past it.
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/lib/auth/config', () => ({ isAuthEnabled: vi.fn() }));
vi.mock('@/lib/auth/viewer', () => ({ getViewer: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));

import { isAuthEnabled } from '@/lib/auth/config';
import {
  authRouteLocale,
  blockedSignIn,
  finishSignIn,
  isBannedError,
  linkFailed,
  redirectTo,
} from '@/lib/auth/routes';
import { getViewer, type Viewer } from '@/lib/auth/viewer';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { GET as callback } from '@/app/[locale]/auth/callback/route';
import { GET as confirm } from '@/app/[locale]/auth/confirm/route';
import { GET as signoutGet, POST as signout } from '@/app/[locale]/auth/signout/route';

const NO_STORE = 'private, no-cache, no-store, must-revalidate, max-age=0';

function params(locale: string) {
  return { params: Promise.resolve({ locale }) };
}

function request(path: string, init?: { method: string }) {
  return new NextRequest(`http://127.0.0.1:3200${path}`, init);
}

function viewer(onboarded: boolean) {
  vi.mocked(getViewer).mockResolvedValue({ id: 'u1', onboarded } as unknown as Viewer);
}

// A Supabase client whose auth calls answer as given.
function fakeSupabase(answers: { verifyOtp?: unknown; exchangeCodeForSession?: unknown } = {}) {
  const auth = {
    verifyOtp: vi.fn(async () => answers.verifyOtp ?? { error: null }),
    exchangeCodeForSession: vi.fn(async () => answers.exchangeCodeForSession ?? { error: null }),
    signOut: vi.fn(async () => ({ error: null })),
  };
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth,
  } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
  return auth;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isAuthEnabled).mockReturnValue(true);
});

describe('redirectTo', () => {
  it('answers with the bare path as Location and lets no cache keep the response', () => {
    const response = redirectTo('/ko/about');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('/ko/about');
    expect(response.headers.get('cache-control')).toBe(NO_STORE);
  });

  it('takes the status to answer with', () => {
    expect(redirectTo('/ko', 303).status).toBe(303);
  });
});

describe('linkFailed', () => {
  it('goes to the login page of the same language, with the link error', () => {
    expect(linkFailed('en').headers.get('location')).toBe('/en/login?error=link');
  });
});

describe('blockedSignIn', () => {
  it('goes to the login page of the same language, with the blocked notice', () => {
    expect(blockedSignIn('en').headers.get('location')).toBe('/en/login?error=blocked');
    expect(blockedSignIn('ko').headers.get('cache-control')).toBe(NO_STORE);
  });
});

// What Supabase Auth (GoTrue) answers for an account with a ban on it. Found on the local stack
// (verifyOtp of an emailed link: HTTP 403, code `user_banned`, "User is banned") and in GoTrue's
// provider callback, which sends the same code and message back as query parameters next to
// `error=access_denied`.
describe('isBannedError', () => {
  it('knows the ban by its code', () => {
    // As supabase-js hands it over from verifyOtp.
    expect(isBannedError(new AuthApiError('User is banned', 403, 'user_banned'))).toBe(true);
    expect(isBannedError({ code: 'user_banned' })).toBe(true);
  });

  it('knows it by the message when there is no code', () => {
    expect(isBannedError({ message: 'User is banned' })).toBe(true);
    expect(isBannedError({ code: null, message: 'user is banned' })).toBe(true);
  });

  it('does not mistake anything else for it', () => {
    for (const error of [
      null,
      undefined,
      {},
      { code: 'otp_expired', message: 'Email link is invalid or has expired' },
      new AuthApiError('invalid JWT', 403, 'bad_jwt'),
      { message: 'Token has expired or is invalid' },
      { code: 'user_not_found', message: 'User is banned or something' },
    ]) {
      expect(isBannedError(error), JSON.stringify(error)).toBe(false);
    }
  });
});

describe('authRouteLocale', () => {
  it('gives the locale from the route', async () => {
    await expect(authRouteLocale(params('en'))).resolves.toBe('en');
  });

  it('is a 404 while accounts are switched off', async () => {
    vi.mocked(isAuthEnabled).mockReturnValue(false);
    await expect(authRouteLocale(params('ko'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('is a 404 for a language the site does not have', async () => {
    await expect(authRouteLocale(params('fr'))).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

describe('finishSignIn', () => {
  it('sends a finished account on to the page it was heading for', async () => {
    viewer(true);
    const response = await finishSignIn('ko', '/ko/about?tab=team');
    expect(response.headers.get('location')).toBe('/ko/about?tab=team');
  });

  it('sends a finished account to the home page when it was heading nowhere', async () => {
    viewer(true);
    expect((await finishSignIn('ko', null)).headers.get('location')).toBe('/ko');
  });

  it('sends a new account to the welcome form, which gets the page to return to', async () => {
    viewer(false);
    const response = await finishSignIn('en', '/en/about?tab=team');
    expect(response.headers.get('location')).toBe(
      `/en/welcome?next=${encodeURIComponent('/en/about?tab=team')}`,
    );
  });

  it.each([
    '//evil.example',
    'https://evil.example/ko',
    '/en/about',
    'javascript:alert(1)',
    '/ko/../en',
  ])('does not follow %s, whether the account is new or finished', async (next) => {
    viewer(true);
    expect((await finishSignIn('ko', next)).headers.get('location')).toBe('/ko');
    viewer(false);
    expect((await finishSignIn('ko', next)).headers.get('location')).toBe('/ko/welcome?next=%2Fko');
  });

  it('treats a failed account lookup as a link that failed, not as a server error', async () => {
    vi.mocked(getViewer).mockRejectedValue(new Error('connection to the database was lost'));
    const response = await finishSignIn('ko', '/ko/about');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('/ko/login?error=link');
  });

  it('treats an account with no profile as a link that failed', async () => {
    vi.mocked(getViewer).mockResolvedValue(null);
    const response = await finishSignIn('ko', '/ko/about');
    expect(response.headers.get('location')).toBe('/ko/login?error=link');
  });
});

describe('GET /{locale}/auth/confirm', () => {
  it('verifies the one-time token as an email token and finishes the sign-in', async () => {
    const auth = fakeSupabase();
    viewer(true);

    const response = await confirm(
      request('/ko/auth/confirm?next=%2Fko%2Fabout&token_hash=abc123&type=email'),
      params('ko'),
    );

    expect(auth.verifyOtp).toHaveBeenCalledWith({ type: 'email', token_hash: 'abc123' });
    expect(response.headers.get('location')).toBe('/ko/about');
  });

  it('sends a new account to the welcome form', async () => {
    fakeSupabase();
    viewer(false);
    const response = await confirm(
      request('/en/auth/confirm?next=%2Fen&token_hash=abc123&type=email'),
      params('en'),
    );
    expect(response.headers.get('location')).toBe('/en/welcome?next=%2Fen');
  });

  it('goes to login with the link error when the token is refused', async () => {
    fakeSupabase({ verifyOtp: { error: { message: 'Token has expired or is invalid' } } });
    const response = await confirm(
      request('/ko/auth/confirm?token_hash=bad&type=email'),
      params('ko'),
    );
    expect(response.headers.get('location')).toBe('/ko/login?error=link');
    expect(getViewer).not.toHaveBeenCalled();
  });

  it('goes to login with the blocked notice when Auth refuses a banned account', async () => {
    // Exactly what the local stack answers for a banned account's emailed link.
    fakeSupabase({
      verifyOtp: {
        data: { user: null, session: null },
        error: {
          name: 'AuthApiError',
          status: 403,
          code: 'user_banned',
          message: 'User is banned',
        },
      },
    });
    const response = await confirm(
      request('/en/auth/confirm?next=%2Fen%2Fabout&token_hash=abc&type=email'),
      params('en'),
    );
    expect(response.headers.get('location')).toBe('/en/login?error=blocked');
    expect(getViewer).not.toHaveBeenCalled();
  });

  it.each([
    ['no token', '/ko/auth/confirm?type=email'],
    ['an empty token', '/ko/auth/confirm?token_hash=&type=email'],
    ['no type', '/ko/auth/confirm?token_hash=abc'],
    ['another type', '/ko/auth/confirm?token_hash=abc&type=recovery'],
  ])('does not ask Supabase when the link has %s', async (_name, path) => {
    const auth = fakeSupabase();
    const response = await confirm(request(path), params('ko'));
    expect(response.headers.get('location')).toBe('/ko/login?error=link');
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it('reads one next value when the parameter is repeated', async () => {
    fakeSupabase();
    viewer(true);
    const response = await confirm(
      request('/ko/auth/confirm?token_hash=abc&type=email&next=%2Fko%2Fabout&next=%2Fko%2Fnetwork'),
      params('ko'),
    );
    expect(response.headers.get('location')).toBe('/ko/about');
  });

  it('is a 404 while accounts are switched off, without touching Supabase', async () => {
    vi.mocked(isAuthEnabled).mockReturnValue(false);
    await expect(
      confirm(request('/ko/auth/confirm?token_hash=abc&type=email'), params('ko')),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });
});

describe('GET /{locale}/auth/callback', () => {
  it('trades the code for a session and finishes the sign-in', async () => {
    const auth = fakeSupabase();
    viewer(true);

    const response = await callback(
      request('/ko/auth/callback?code=the-code&next=%2Fko%2Fnetwork'),
      params('ko'),
    );

    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('the-code');
    expect(response.headers.get('location')).toBe('/ko/network');
  });

  it('sends a new account to the welcome form', async () => {
    fakeSupabase();
    viewer(false);
    const response = await callback(request('/ko/auth/callback?code=the-code'), params('ko'));
    expect(response.headers.get('location')).toBe('/ko/welcome?next=%2Fko');
  });

  it('goes to login with the link error when the code is refused', async () => {
    fakeSupabase({ exchangeCodeForSession: { error: { message: 'invalid grant' } } });
    const response = await callback(request('/ko/auth/callback?code=bad'), params('ko'));
    expect(response.headers.get('location')).toBe('/ko/login?error=link');
  });

  it('does not ask Supabase when there is no code', async () => {
    const auth = fakeSupabase();
    const response = await callback(request('/ko/auth/callback'), params('ko'));
    expect(response.headers.get('location')).toBe('/ko/login?error=link');
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('goes to login with the Google message when the provider refuses', async () => {
    const auth = fakeSupabase();
    for (const search of [
      '?error=access_denied&error_description=denied&next=%2Fko%2Fabout',
      '?error_description=denied',
      // A code does not rescue a sign-in that also says it failed.
      '?code=the-code&error=server_error',
    ]) {
      const response = await callback(request(`/en/auth/callback${search}`), params('en'));
      expect(response.headers.get('location'), search).toBe('/en/login?error=oauth');
    }
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('goes to login with the blocked notice when Auth turns a banned account away', async () => {
    const auth = fakeSupabase();
    for (const search of [
      // What GoTrue sends back for a banned account.
      '?error=access_denied&error_code=user_banned&error_description=User+is+banned&next=%2Fko%2Fabout',
      // The same without the code, as an older Auth would send it.
      '?error=access_denied&error_description=User%20is%20banned',
    ]) {
      const response = await callback(request(`/ko/auth/callback${search}`), params('ko'));
      expect(response.headers.get('location'), search).toBe('/ko/login?error=blocked');
    }
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('goes to login with the blocked notice when the code is refused for a banned account', async () => {
    fakeSupabase({
      exchangeCodeForSession: {
        error: { status: 403, code: 'user_banned', message: 'User is banned' },
      },
    });
    const response = await callback(request('/en/auth/callback?code=the-code'), params('en'));
    expect(response.headers.get('location')).toBe('/en/login?error=blocked');
    expect(getViewer).not.toHaveBeenCalled();
  });

  it('is a 404 while accounts are switched off', async () => {
    vi.mocked(isAuthEnabled).mockReturnValue(false);
    await expect(callback(request('/ko/auth/callback?code=x'), params('ko'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });
});

describe('POST /{locale}/auth/signout', () => {
  it('signs out of this browser only and returns to the locale home with a 303', async () => {
    const auth = fakeSupabase();
    const response = await signout(request('/en/auth/signout', { method: 'POST' }), params('en'));
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/en');
    expect(response.headers.get('cache-control')).toBe(NO_STORE);
  });

  it('is a 404 while accounts are switched off, without touching Supabase', async () => {
    vi.mocked(isAuthEnabled).mockReturnValue(false);
    await expect(
      signout(request('/ko/auth/signout', { method: 'POST' }), params('ko')),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it('is a 404 to open in the browser, signed in or not', () => {
    expect(() => signoutGet()).toThrow('NEXT_NOT_FOUND');
  });
});
