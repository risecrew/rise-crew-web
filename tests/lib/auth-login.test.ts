import { describe, expect, it } from 'vitest';
import {
  RESEND_SECONDS,
  callbackUrl,
  confirmUrl,
  isEmailAddress,
  leaveLogin,
  leaveWelcome,
  loginNotice,
} from '@/lib/auth/login';

describe('leaveLogin', () => {
  it('follows next like safeNext does', () => {
    expect(leaveLogin('/ko/about', 'ko')).toBe('/ko/about');
    expect(leaveLogin('/en/about?tab=1#top', 'en')).toBe('/en/about?tab=1#top');
    expect(leaveLogin(null, 'ko')).toBe('/ko');
    expect(leaveLogin('https://evil.example/ko', 'ko')).toBe('/ko');
    expect(leaveLogin('/en/about', 'ko')).toBe('/ko');
  });

  it('never points back at the login page, which would only redirect in a circle', () => {
    for (const next of [
      '/ko/login',
      '/ko/login/',
      '/ko/login?next=%2Fko%2Flogin',
      '/ko/login#top',
      '/ko/login/anything',
      '/ko/%6Cogin',
      '/ko/%6cogin/',
    ]) {
      expect(leaveLogin(next, 'ko'), next).toBe('/ko');
    }
    expect(leaveLogin('/en/login', 'en')).toBe('/en');
  });

  it('leaves pages whose name only starts like the login page alone', () => {
    expect(leaveLogin('/ko/loginx', 'ko')).toBe('/ko/loginx');
    expect(leaveLogin('/ko/about/login', 'ko')).toBe('/ko/about/login');
  });
});

describe('leaveWelcome', () => {
  it('follows next like safeNext does', () => {
    expect(leaveWelcome('/ko/about', 'ko')).toBe('/ko/about');
    expect(leaveWelcome('/en/about?tab=1#top', 'en')).toBe('/en/about?tab=1#top');
    expect(leaveWelcome(null, 'ko')).toBe('/ko');
    expect(leaveWelcome('https://evil.example/ko', 'ko')).toBe('/ko');
  });

  it('never points back at the welcome page, which would only redirect in a circle', () => {
    for (const next of [
      '/ko/welcome',
      '/ko/welcome/',
      '/ko/welcome?next=%2Fko%2Fwelcome',
      '/ko/%77elcome',
    ]) {
      expect(leaveWelcome(next, 'ko'), next).toBe('/ko');
    }
    expect(leaveWelcome('/en/welcome', 'en')).toBe('/en');
  });

  it('leaves the login page alone, which sends a signed-in visitor on by itself', () => {
    expect(leaveWelcome('/ko/login', 'ko')).toBe('/ko/login');
  });
});

describe('the links the sign-in form hands to Supabase', () => {
  it('sends the emailed link to the confirm route of this site and language', () => {
    expect(confirmUrl('http://127.0.0.1:3200', 'ko', '/ko/about')).toBe(
      'http://127.0.0.1:3200/ko/auth/confirm?next=%2Fko%2Fabout',
    );
    expect(confirmUrl('https://example.test', 'en', '/en')).toBe(
      'https://example.test/en/auth/confirm?next=%2Fen',
    );
  });

  it('always holds a "?", because the email template appends "&token_hash=..."', () => {
    expect(confirmUrl('https://example.test', 'ko', '/ko')).toContain('?next=');
  });

  it('sends Google back to the callback route', () => {
    expect(callbackUrl('http://127.0.0.1:3200', 'ko', '/ko/about?x=1')).toBe(
      'http://127.0.0.1:3200/ko/auth/callback?next=%2Fko%2Fabout%3Fx%3D1',
    );
  });

  it('vets next again, so a hostile value cannot ride along', () => {
    expect(confirmUrl('https://example.test', 'ko', 'https://evil.example')).toBe(
      'https://example.test/ko/auth/confirm?next=%2Fko',
    );
    expect(callbackUrl('https://example.test', 'ko', '//evil.example')).toBe(
      'https://example.test/ko/auth/callback?next=%2Fko',
    );
  });
});

describe('isEmailAddress', () => {
  it('accepts ordinary addresses', () => {
    for (const email of ['a@b.co', 'member@example.test', 'first.last+tag@sub.example.kr']) {
      expect(isEmailAddress(email), email).toBe(true);
    }
  });

  it('refuses text that cannot be an address', () => {
    for (const email of ['', 'nope', 'a@b', '@b.co', 'a@.co', 'a b@c.co', 'a@b c.co', 'a@@b.co']) {
      expect(isEmailAddress(email), email).toBe(false);
    }
  });
});

describe('loginNotice', () => {
  it('knows the three codes the sign-in routes send', () => {
    expect(loginNotice('link')).toBe('link');
    expect(loginNotice('blocked')).toBe('blocked');
    expect(loginNotice('oauth')).toBe('oauth');
  });

  it('shows nothing for anything else', () => {
    expect(loginNotice(undefined)).toBeNull();
    expect(loginNotice('')).toBeNull();
    expect(loginNotice('whatever')).toBeNull();
    expect(loginNotice('LINK')).toBeNull();
    expect(loginNotice('constructor')).toBeNull();
  });
});

describe('RESEND_SECONDS', () => {
  it('is a minute', () => {
    expect(RESEND_SECONDS).toBe(60);
  });
});
