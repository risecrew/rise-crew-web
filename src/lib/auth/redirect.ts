import type { Locale } from '@/i18n/locales';

const MAX_LENGTH = 2048;
const BASE = 'http://safe-next.invalid';
// Control characters (tab and newline are stripped by browsers, turning "/\t/evil" into "//evil")
// and backslashes (browsers read "\" as "/").
const FORBIDDEN = /[\u0000-\u001f\u007f\\]/;

// Where to go after sign-in. `next` arrives in a query string, so anyone can craft it: it is
// followed only when it is a path on this site inside the current locale. Everything else
// (other hosts, protocol-relative "//host", "javascript:", another locale, plain "me") becomes the
// locale home. The path is normalised first, so "/ko/../fr" is judged as "/fr".
export function safeNext(next: string | null | undefined, locale: Locale): string {
  const home = `/${locale}`;
  if (!next || next.length > MAX_LENGTH) return home;
  if (!next.startsWith('/') || next.startsWith('//') || FORBIDDEN.test(next)) return home;

  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return home;
  }
  if (url.origin !== BASE) return home;
  if (url.pathname !== home && !url.pathname.startsWith(`${home}/`)) return home;

  return `${url.pathname}${url.search}${url.hash}`;
}
