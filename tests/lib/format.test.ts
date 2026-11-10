import { describe, expect, it } from 'vitest';
import { formatCaption, formatDateRange, formatStampDate } from '@/lib/format';

describe('formatStampDate', () => {
  it('formats Korean dates with dots', () => {
    expect(formatStampDate('2026-01-30', 'ko')).toBe('2026.01.30');
    expect(formatStampDate('2026-04', 'ko')).toBe('2026.04');
    expect(formatStampDate('2025', 'ko')).toBe('2025');
  });
  it('formats English dates as month, day, year', () => {
    expect(formatStampDate('2026-01-30', 'en')).toBe('Jan 30, 2026');
    expect(formatStampDate('2026-04', 'en')).toBe('Apr 2026');
    expect(formatStampDate('2025', 'en')).toBe('2025');
  });
});

describe('formatDateRange', () => {
  it('is the single date when there is no end, or the end is the same day', () => {
    expect(formatDateRange('2025-12-12', undefined, 'ko')).toBe('2025.12.12');
    expect(formatDateRange('2025-12-12', '2025-12-12', 'en')).toBe('Dec 12, 2025');
  });
  it('drops the repeated year in Korean', () => {
    expect(formatDateRange('2025-12-22', '2025-12-26', 'ko')).toBe('2025.12.22–12.26');
    expect(formatDateRange('2025-12-30', '2026-01-02', 'ko')).toBe('2025.12.30–2026.01.02');
  });
  it('drops the repeated month and year in English', () => {
    expect(formatDateRange('2025-12-22', '2025-12-26', 'en')).toBe('Dec 22–26, 2025');
    expect(formatDateRange('2026-01-30', '2026-02-02', 'en')).toBe('Jan 30 – Feb 2, 2026');
    expect(formatDateRange('2025-12-30', '2026-01-02', 'en')).toBe('Dec 30, 2025 – Jan 2, 2026');
  });
});

describe('formatCaption', () => {
  it('is name · place · date', () => {
    const stamp = {
      title: { ko: 'SMU × SKKU AI 바이브코딩 스프린트', en: 'SMU × SKKU AI Vibe Coding Sprint' },
      city: { ko: '싱가포르', en: 'Singapore' },
      date: '2025-12-22',
      endDate: '2025-12-26',
    };
    expect(formatCaption(stamp, 'ko')).toBe(
      'SMU × SKKU AI 바이브코딩 스프린트 · 싱가포르 · 2025.12.22–12.26',
    );
    expect(formatCaption(stamp, 'en')).toBe(
      'SMU × SKKU AI Vibe Coding Sprint · Singapore · Dec 22–26, 2025',
    );
  });
  it('leaves out a date nobody knows', () => {
    expect(
      formatCaption(
        { title: { ko: '행사', en: 'Event' }, city: { ko: '서울', en: 'Seoul' } },
        'ko',
      ),
    ).toBe('행사 · 서울');
  });
});
