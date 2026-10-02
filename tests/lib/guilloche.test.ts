import { describe, expect, it } from 'vitest';
import { BRAND } from '@/lib/brand';
import { GUILLOCHE_TILE, guillocheSvg, isPalette, PALETTES } from '@/lib/guilloche';

const paths = (svg: string) => [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
const ys = (d: string) => [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[2]));

describe('guillocheSvg', () => {
  it('is a fixed-size tile for every palette', () => {
    for (const p of PALETTES) {
      const svg = guillocheSvg(p);
      expect(svg).toContain(`width="${GUILLOCHE_TILE.width}" height="${GUILLOCHE_TILE.height}"`);
    }
  });
  it('repeats seamlessly: every line ends at the height it starts', () => {
    for (const d of paths(guillocheSvg('blue'))) {
      const y = ys(d);
      expect(y[y.length - 1]).toBeCloseTo(y[0], 1);
    }
  });
  it('weaves two families of hairlines', () => {
    const svg = guillocheSvg('blue');
    expect(svg).toContain('stroke-width="0.5"');
    expect(paths(svg).length).toBeGreaterThanOrEqual(24);
  });
  it('colors each palette from the logo', () => {
    expect(guillocheSvg('blue')).toContain(BRAND.ocean);
    expect(guillocheSvg('green')).toContain(BRAND.lime);
  });
  it('stays small enough to repeat as a background', () => {
    for (const p of PALETTES) expect(guillocheSvg(p).length).toBeLessThan(40_000);
  });
  it('recognizes palettes', () => {
    expect(isPalette('teal')).toBe(true);
    expect(isPalette('navy')).toBe(false);
  });
});
