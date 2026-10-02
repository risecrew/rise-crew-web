import { describe, expect, it } from 'vitest';
import { formatStampDate, guillochePath, stampRotation, toMrz } from '@/lib/passport';

describe('guillochePath', () => {
  const opts = { cx: 500, cy: 500, radius: 200, amplitude: 20, petals: 12, steps: 120 };

  it('is a closed path with one point per step', () => {
    const d = guillochePath(opts);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d.match(/[ML]/g)).toHaveLength(120);
  });
  it('is deterministic', () => {
    expect(guillochePath(opts)).toBe(guillochePath(opts));
  });
  it('rejects fewer than 3 steps', () => {
    expect(() => guillochePath({ ...opts, steps: 2 })).toThrow(RangeError);
  });
});

describe('toMrz', () => {
  it('joins fields with << and pads with < to 44 characters', () => {
    const mrz = toMrz(['RISE CREW', 'SKKU', 'KOR']);
    expect(mrz).toHaveLength(44);
    expect(mrz.startsWith('RISE<CREW<<SKKU<<KOR<')).toBe(true);
  });
  it('drops characters outside A-Z and 0-9, including Hangul', () => {
    expect(toMrz(['라이즈 크루', 'Café 2025'])).toBe('CAFE<2025'.padEnd(44, '<'));
  });
  it('truncates long input to the width', () => {
    expect(toMrz(['A'.repeat(60)])).toBe('A'.repeat(44));
  });
});

describe('stampRotation', () => {
  it('is a stable integer between -5 and 5', () => {
    for (const id of ['aix-contest', 'sushi-tech', 'a', 'kuala-lumpur-ir']) {
      const r = stampRotation(id);
      expect(Number.isInteger(r)).toBe(true);
      expect(r).toBeGreaterThanOrEqual(-5);
      expect(r).toBeLessThanOrEqual(5);
      expect(stampRotation(id)).toBe(r);
    }
  });
});

describe('formatStampDate', () => {
  it('formats Korean dates with dots', () => {
    expect(formatStampDate('2026-01-30', 'ko')).toBe('2026.01.30');
    expect(formatStampDate('2026-04', 'ko')).toBe('2026.04');
    expect(formatStampDate('2025', 'ko')).toBe('2025');
  });
  it('formats English dates passport-style', () => {
    expect(formatStampDate('2026-01-30', 'en')).toBe('30 JAN 2026');
    expect(formatStampDate('2026-04', 'en')).toBe('APR 2026');
    expect(formatStampDate('2025', 'en')).toBe('2025');
  });
});
