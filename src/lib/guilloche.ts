import { BRAND } from './brand';
import { guillochePath } from './passport';

export const PALETTES = ['blue', 'teal', 'green', 'white'] as const;
export type Palette = (typeof PALETTES)[number];

export function isPalette(value: string): value is Palette {
  return (PALETTES as readonly string[]).includes(value);
}

const STOPS: Record<Palette, readonly string[]> = {
  blue: [BRAND.cobalt, BRAND.ocean, BRAND.sky],
  teal: [BRAND.ocean, BRAND.teal, BRAND.leaf],
  green: [BRAND.teal, BRAND.leaf, BRAND.lime],
  white: ['#ffffff', '#ffffff', '#ffffff'],
};

const BANDS = [
  { radius: 170, amplitude: 26, petals: 20 },
  { radius: 290, amplitude: 30, petals: 28 },
  { radius: 410, amplitude: 34, petals: 36 },
] as const;
const CURVES_PER_BAND = 8;

// Security-print style: each band is the same rosette drawn several times with a shifted
// phase, so the hairlines cross and weave instead of reading as one wavy line.
export function guillocheSvg(palette: Palette): string {
  const stops = STOPS[palette]
    .map((color, i, all) => `<stop offset="${i / (all.length - 1)}" stop-color="${color}"/>`)
    .join('');
  const curves = BANDS.flatMap(({ radius, amplitude, petals }) =>
    Array.from(
      { length: CURVES_PER_BAND },
      (_, k) =>
        `<path d="${guillochePath({ cx: 500, cy: 500, radius, amplitude, petals, steps: 240, phase: (k * Math.PI) / CURVES_PER_BAND })}"/>`,
    ),
  ).join('');
  const opacity = palette === 'white' ? 0.18 : 0.45;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient></defs><g fill="none" stroke="url(#g)" stroke-width="0.6" opacity="${opacity}">${curves}</g></svg>`;
}
