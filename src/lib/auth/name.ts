import type { Locale } from '@/i18n/locales';

type NameParts = { last_name: string | null; first_name: string | null };

// Korean: family name then given name, no space ("김라이즈"). English: given name then family
// name ("Rise Kim").
export function displayName(p: NameParts, locale: Locale): string {
  const last = p.last_name?.trim() ?? '';
  const first = p.first_name?.trim() ?? '';
  return locale === 'ko' ? `${last}${first}` : `${first} ${last}`.trim();
}

const CJK_NAME = /[\p{Script=Hangul}\p{Script=Han}]/u;

function firstGrapheme(text: string): string {
  if (text === '') return '';
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const first = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
      .segment(text)
      [Symbol.iterator]()
      .next();
    if (!first.done) return first.value.segment;
  }
  return Array.from(text)[0] ?? '';
}

// The letter shown on an avatar. It does not depend on the site language, so the same person gets
// the same initial everywhere: a Korean (or other CJK) name starts with the family name, as in
// "김라이즈" -> "김"; a Latin name uses the given name, as in "Rise Kim" -> "R".
export function initial(p: NameParts): string {
  const last = p.last_name?.trim() ?? '';
  const first = p.first_name?.trim() ?? '';
  if (CJK_NAME.test(`${last}${first}`)) {
    return firstGrapheme(`${last}${first}`);
  }
  return firstGrapheme(first || last).toLocaleUpperCase();
}
