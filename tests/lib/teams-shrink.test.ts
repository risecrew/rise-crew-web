import { describe, expect, it } from 'vitest';
import { fitWithin } from '@/lib/teams/shrink';

describe('fitWithin', () => {
  it('leaves a small picture alone', () => {
    expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 });
  });
  it('brings the longer side down and keeps the shape', () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 });
  });
  it('never makes a side zero', () => {
    expect(fitWithin(10000, 1, 2000)).toEqual({ width: 2000, height: 1 });
  });
});
