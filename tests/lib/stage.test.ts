import { describe, expect, it } from 'vitest';
import {
  countUpValue,
  galleryCaptionFrames,
  galleryCity,
  galleryLength,
  galleryPhotoRange,
  gallerySnapPoints,
  parseStatValue,
} from '@/lib/stage';

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

// Linear interpolation over keyframes, as the scroll-linked transforms do.
function at(input: number[], output: number[], x: number) {
  if (x <= input[0]) return output[0];
  for (let i = 1; i < input.length; i++) {
    if (x <= input[i]) {
      const t = (x - input[i - 1]) / (input[i] - input[i - 1]);
      return output[i - 1] + (output[i] - output[i - 1]) * t;
    }
  }
  return output[output.length - 1];
}

describe('Global gallery timing', () => {
  const COUNT = 4;

  it('gives every city one screen of scroll plus a short hold after the last', () => {
    expect(galleryLength(COUNT)).toBeCloseTo(3.3);
    expect(galleryLength(1)).toBeCloseTo(0.3);
  });

  it('names the city being read at each scroll position', () => {
    expect(galleryCity(0, COUNT)).toBe(0);
    expect(galleryCity(0.3, COUNT)).toBe(0);
    expect(galleryCity(0.8, COUNT)).toBe(1);
    expect(galleryCity(1, COUNT)).toBe(1);
    expect(galleryCity(galleryLength(COUNT), COUNT)).toBe(3);
    expect(galleryCity(-1, COUNT)).toBe(0);
    expect(galleryCity(99, COUNT)).toBe(3);
  });

  it('holds each caption fully still for most of its screen', () => {
    for (let i = 0; i < COUNT; i++) {
      const f = galleryCaptionFrames(i, COUNT);
      // The hold: from just after it arrives until just before the next city starts.
      for (const x of [i - 0.3, i, i + 0.2].filter((v) => v >= 0)) {
        expect(at(f.input, f.opacity, x)).toBe(1);
        expect(at(f.input, f.y, x)).toBe(0);
      }
    }
  });

  it('moves captions up, the same way as the scroll', () => {
    const f = galleryCaptionFrames(1, COUNT);
    expect(at(f.input, f.y, 0.4)).toBeGreaterThan(0); // arriving from below
    expect(at(f.input, f.y, 1.4)).toBeLessThan(0); // leaving upward
  });

  it('never shows two captions at once', () => {
    for (let x = 0; x <= galleryLength(COUNT); x += 0.01) {
      const visible = Array.from({ length: COUNT }, (_, i) => {
        const f = galleryCaptionFrames(i, COUNT);
        return at(f.input, f.opacity, x);
      }).filter((o) => o > 0);
      expect(visible.length).toBeLessThanOrEqual(1);
    }
  });

  it('keeps the first caption in place at the start and the last one at the end', () => {
    const first = galleryCaptionFrames(0, COUNT);
    expect(at(first.input, first.opacity, 0)).toBe(1);
    const last = galleryCaptionFrames(COUNT - 1, COUNT);
    expect(at(last.input, last.opacity, galleryLength(COUNT))).toBe(1);
    const only = galleryCaptionFrames(0, 1);
    expect(at(only.input, only.opacity, 0.2)).toBe(1);
  });

  it('finishes wiping each photo up before its caption settles', () => {
    for (let i = 1; i < COUNT; i++) {
      const [start, end] = galleryPhotoRange(i);
      const f = galleryCaptionFrames(i, COUNT);
      expect(start).toBeGreaterThan(i - 1);
      expect(end).toBeLessThanOrEqual(f.input[1]);
    }
  });

  it('snaps to a point inside each city hold', () => {
    const points = gallerySnapPoints(COUNT);
    expect(points).toHaveLength(COUNT);
    points.forEach((p, i) => {
      expect(galleryCity(p, COUNT)).toBe(i);
      const f = galleryCaptionFrames(i, COUNT);
      expect(at(f.input, f.opacity, p)).toBe(1);
      expect(at(f.input, f.y, p)).toBe(0);
    });
  });
});
