import { describe, expect, it } from 'vitest';
import { countUpValue, parseStatValue, slideCounter } from '@/lib/stage';

describe('parseStatValue', () => {
  it('splits a number from its suffix', () => {
    expect(parseStatValue('90+')).toEqual({ number: 90, suffix: '+' });
    expect(parseStatValue('33')).toEqual({ number: 33, suffix: '' });
  });
  it('returns null for values that are not counts', () => {
    expect(parseStatValue('MOU')).toBeNull();
  });
});

describe('countUpValue', () => {
  it('starts at 0 and lands exactly on the target', () => {
    expect(countUpValue(90, 0)).toBe(0);
    expect(countUpValue(90, 1)).toBe(90);
  });
  it('never decreases as time passes', () => {
    let previous = 0;
    for (let t = 0; t <= 1; t += 0.05) {
      const value = countUpValue(22, t);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });
  it('clamps progress outside 0..1', () => {
    expect(countUpValue(33, -1)).toBe(0);
    expect(countUpValue(33, 2)).toBe(33);
  });
});

describe('slideCounter', () => {
  it('pads both numbers to two digits', () => {
    expect(slideCounter(3, 11)).toBe('03 / 11');
  });
});
