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

export function guillocheSvg(palette: Palette): string {
  const stops = STOPS[palette]
    .map((color, i, all) => `<stop offset="${i / (all.length - 1)}" stop-color="${color}"/>`)
    .join('');
  const rings = Array.from(
    { length: 7 },
    (_, i) =>
      `<path d="${guillochePath({ cx: 500, cy: 500, radius: 110 + i * 52, amplitude: 14 + i * 3, petals: 18 + i * 6, steps: 480, phase: i * 0.6 })}"/>`,
  ).join('');
  const opacity = palette === 'white' ? 0.16 : 0.5;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient></defs><g fill="none" stroke="url(#g)" stroke-width="1.1" opacity="${opacity}">${rings}</g></svg>`;
}
