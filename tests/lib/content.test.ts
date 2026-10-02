import { describe, expect, it } from 'vitest';
import type { Stamp } from '@/content/schema';
import { applyCta, getMentors, getPress, getStamps, pick, stampState } from '@/lib/content';

const L = (ko: string, en: string) => ({ ko, en });
const planned = (date?: string): Stamp => ({
  id: 'x',
  date,
  city: L('서울', 'Seoul'),
  country: 'KR',
  title: L('행사', 'Event'),
  stage: 'domestic',
  status: 'planned',
  evidence: [],
});

describe('pick', () => {
  it('returns the string for the locale', () => {
    expect(pick(L('안녕', 'Hello'), 'en')).toBe('Hello');
    expect(pick(L('안녕', 'Hello'), 'ko')).toBe('안녕');
  });
});

describe('stampState', () => {
  const today = new Date('2026-10-03T09:00:00Z');

  it('keeps done stamps done', () => {
    expect(
      stampState(
        {
          ...planned('2026-01-30'),
          status: 'done',
          evidence: [{ kind: 'press', label: L('a', 'a') }],
        },
        today,
      ),
    ).toBe('done');
  });
  it('marks a future planned stamp as upcoming', () => {
    expect(stampState(planned('2026-12'), today)).toBe('upcoming');
  });
  it('treats the current month as upcoming', () => {
    expect(stampState(planned('2026-10'), today)).toBe('upcoming');
  });
  it('marks a past planned stamp as unconfirmed', () => {
    expect(stampState(planned('2026-07'), today)).toBe('unconfirmed');
    expect(stampState(planned('2026-08-28'), today)).toBe('unconfirmed');
  });
  it('treats an undated planned stamp as upcoming', () => {
    expect(stampState(planned(undefined), today)).toBe('upcoming');
  });
});

describe('applyCta', () => {
  it('links to the form when open', () => {
    expect(
      applyCta({ status: 'open', period: L('3월', 'March'), applyUrl: 'https://forms.gle/x' }),
    ).toEqual({
      kind: 'apply',
      href: 'https://forms.gle/x',
    });
  });
  it('falls back to a notice when closed', () => {
    const notice = L('다음 모집 안내', 'Next intake');
    expect(applyCta({ status: 'closed', nextNotice: notice })).toEqual({
      kind: 'notice',
      message: notice,
    });
  });
});

describe('ordering', () => {
  it('sorts stamps by date with undated stamps last', async () => {
    const stamps = await getStamps();
    const dated = stamps.filter((s) => s.date).map((s) => s.date!);
    expect(dated).toEqual([...dated].sort());
    const firstUndated = stamps.findIndex((s) => !s.date);
    if (firstUndated !== -1) expect(stamps.slice(firstUndated).every((s) => !s.date)).toBe(true);
  });
  it('lists featured mentors first', async () => {
    const mentors = await getMentors();
    const firstNonFeatured = mentors.findIndex((m) => !m.featured);
    expect(mentors.slice(firstNonFeatured).every((m) => !m.featured)).toBe(true);
  });
  it('lists press newest first', async () => {
    const press = await getPress();
    const dates = press.map((p) => p.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});
