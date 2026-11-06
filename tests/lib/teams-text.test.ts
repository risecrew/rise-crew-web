import { describe, expect, it } from 'vitest';
import { linkify, postDate } from '@/lib/teams/text';

describe('linkify', () => {
  it('leaves a trailing period outside the link', () => {
    expect(linkify('보세요 https://a.test/x. 끝')).toEqual([
      { kind: 'text', value: '보세요 ' },
      { kind: 'link', value: 'https://a.test/x' },
      { kind: 'text', value: '. 끝' },
    ]);
  });
  it('finds http too, and more than one', () => {
    expect(linkify('http://a.test https://b.test')).toEqual([
      { kind: 'link', value: 'http://a.test' },
      { kind: 'text', value: ' ' },
      { kind: 'link', value: 'https://b.test' },
    ]);
  });
  it('leaves a closing bracket outside unless the address opened one', () => {
    expect(linkify('(https://a.test)')).toEqual([
      { kind: 'text', value: '(' },
      { kind: 'link', value: 'https://a.test' },
      { kind: 'text', value: ')' },
    ]);
    expect(linkify('https://a.test/x_(y)')).toEqual([
      { kind: 'link', value: 'https://a.test/x_(y)' },
    ]);
  });
  it('stops at Korean right after an address', () => {
    expect(linkify('https://a.test/x에서')).toEqual([
      { kind: 'link', value: 'https://a.test/x' },
      { kind: 'text', value: '에서' },
    ]);
  });
  it('keeps everything else as text', () => {
    for (const text of ['javascript:alert(1)', 'www.a.test', '<b>굵게</b>', 'https://', '']) {
      expect(linkify(text).every((part) => part.kind === 'text')).toBe(true);
    }
  });
  it('does not lose a word from the text', () => {
    const text = '앞 https://a.test/x?y=1&z=2, 뒤\n둘째 줄';
    expect(
      linkify(text)
        .map((part) => part.value)
        .join(''),
    ).toBe(text);
  });
});

describe('postDate', () => {
  it('shows the date in Korea, whichever server renders it', () => {
    expect(postDate('2026-11-05T15:30:00Z', 'ko')).toBe('2026.11.06');
    expect(postDate('2026-11-05T15:30:00Z', 'en')).toBe('6 NOV 2026');
  });
});
