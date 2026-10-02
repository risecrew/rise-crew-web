import { describe, expect, it } from 'vitest';
import { BRAND } from '@/lib/brand';
import { guillocheSvg, isPalette, PALETTES } from '@/lib/guilloche';

describe('guillocheSvg', () => {
  it('weaves 3 bands of 8 phase-shifted curves for every palette', () => {
    for (const p of PALETTES) {
      const svg = guillocheSvg(p);
      expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
      expect(svg.match(/<path /g)).toHaveLength(24);
    }
  });
  it('draws hairlines so the pattern reads as security print', () => {
    expect(guillocheSvg('blue')).toContain('stroke-width="0.6"');
  });
  it('stays under 80 KB so pages can reuse it as a background', () => {
    for (const p of PALETTES) expect(guillocheSvg(p).length).toBeLessThan(80_000);
  });
  it('uses logo colors for the blue and green palettes', () => {
    expect(guillocheSvg('blue')).toContain(BRAND.cobalt);
    expect(guillocheSvg('green')).toContain(BRAND.lime);
  });
  it('recognizes palettes', () => {
    expect(isPalette('teal')).toBe(true);
    expect(isPalette('navy')).toBe(false);
  });
});
