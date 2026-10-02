import { describe, expect, it } from 'vitest';
import { stamps } from '@/content/data/stamps';
import {
  formatStampDate,
  STAMP_SHAPES,
  stampRotation,
  stampScale,
  stampShape,
  toMrz,
  waveLinePath,
} from '@/lib/passport';

const yAt = (d: string, which: 'first' | 'last') => {
  const points = [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)];
  const point = which === 'first' ? points[0] : points[points.length - 1];
  return { x: Number(point[1]), y: Number(point[2]) };
};

describe('waveLinePath', () => {
  const opts = { y: 30, amplitude: 4, periods: 2, width: 240, step: 4 };

  it('spans the tile from x=0 to x=width', () => {
    const d = waveLinePath(opts);
    expect(yAt(d, 'first').x).toBe(0);
    expect(yAt(d, 'last').x).toBe(240);
  });
  it('ends at the height it starts so the tile repeats seamlessly', () => {
    for (const phase of [0, 0.7, Math.PI]) {
      const d = waveLinePath({ ...opts, phase });
      expect(yAt(d, 'last').y).toBeCloseTo(yAt(d, 'first').y, 1);
    }
  });
  it('rejects a fractional number of periods, which would break the seam', () => {
    expect(() => waveLinePath({ ...opts, periods: 1.5 })).toThrow(RangeError);
  });
});

describe('stampShape and stampScale', () => {
  it('is stable for the same id', () => {
    expect(stampShape('aix-contest')).toBe(stampShape('aix-contest'));
    expect(stampScale('aix-contest')).toBe(stampScale('aix-contest'));
  });
  it('varies the shapes across the real stamps', () => {
    const shapes = new Set(stamps.map((s) => stampShape(s.id)));
    expect(shapes.size).toBeGreaterThanOrEqual(3);
    for (const shape of shapes) expect(STAMP_SHAPES).toContain(shape);
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
