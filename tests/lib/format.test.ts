import { describe, expect, it } from 'vitest';
import { formatStampDate } from '@/lib/format';

describe('formatStampDate', () => {
  it('formats Korean dates with dots', () => {
    expect(formatStampDate('2026-01-30', 'ko')).toBe('2026.01.30');
    expect(formatStampDate('2026-04', 'ko')).toBe('2026.04');
    expect(formatStampDate('2025', 'ko')).toBe('2025');
  });
  it('formats English dates compactly', () => {
    expect(formatStampDate('2026-01-30', 'en')).toBe('30 JAN 2026');
    expect(formatStampDate('2026-04', 'en')).toBe('APR 2026');
    expect(formatStampDate('2025', 'en')).toBe('2025');
  });
});
