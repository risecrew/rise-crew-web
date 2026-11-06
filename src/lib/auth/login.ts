import type { Locale } from '@/i18n/locales';
import { safeNext } from './redirect';

// How long the "send again" button waits after a link goes out, so one click cannot become a pile
// of emails.
export const RESEND_SECONDS = 60;

// How long the code in a mail is. The same as otp_length in supabase/config.toml and the dashboard of
// each project. Auth limits tries by address of the visitor but not per code, so it is longer than the
// usual six digits, and it stays valid for 10 minutes (otp_expiry).
export const OTP_LENGTH = 8;

// Where to go on from a screen that has nothing more to do for the visitor: where they were
// heading, as safeNext decides it, except the screen itself. Sending them there would only bring
// them back. The path is judged the way the router reads it (percent-escapes decoded, a trailing
// slash dropped), so "/ko/%6Cogin/" counts as the login page too.
function leaveScreen(next: string | null | undefined, locale: Locale, screen: string): string {
  const target = safeNext(next, locale);
  const path = target.split(/[?#]/)[0];

  let readAs: string;
  try {
    readAs = decodeURIComponent(path).replace(/\/+$/, '');
  } catch {
    return `/${locale}`;
  }
  const own = `/${locale}/${screen}`;
  return readAs === own || readAs.startsWith(`${own}/`) ? `/${locale}` : target;
}

// For a visitor who opens the login page while already signed in.
export function leaveLogin(next: string | null | undefined, locale: Locale): string {
  return leaveScreen(next, locale, 'login');
}

// For a visitor who opens the sign-up form with nothing left to fill in, or who has just finished it.
export function leaveWelcome(next: string | null | undefined, locale: Locale): string {
  return leaveScreen(next, locale, 'welcome');
}

// The address Google (through Supabase) sends the visitor back to.
export function callbackUrl(origin: string, locale: Locale, next: string): string {
  return `${origin}/${locale}/auth/callback?next=${encodeURIComponent(safeNext(next, locale))}`;
}

// Good enough to catch a typo before a request is made; the mail server has the last word.
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function isEmailAddress(value: string): boolean {
  return EMAIL.test(value);
}

export const LOGIN_NOTICES = ['link', 'blocked', 'oauth'] as const;
export type LoginNotice = (typeof LOGIN_NOTICES)[number];

// The `?error=` codes the sign-in routes send to the login page; anything else shows nothing.
export function loginNotice(code: string | undefined): LoginNotice | null {
  return LOGIN_NOTICES.find((notice) => notice === code) ?? null;
}
