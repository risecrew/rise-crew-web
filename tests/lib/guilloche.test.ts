import { describe, expect, it } from 'vitest';
import { BRAND } from '@/lib/brand';
import { guillocheSvg, isPalette, PALETTES } from '@/lib/guilloche';

describe('guillocheSvg', () => {
  it('renders 7 rings for every palette', () => {
    for (const p of PALETTES) {
      const svg = guillocheSvg(p);
      expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
      expect(svg.match(/<path /g)).toHaveLength(7);
    }
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
