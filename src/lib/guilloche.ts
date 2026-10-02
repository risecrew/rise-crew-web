import { BRAND } from './brand';
import { waveLinePath } from './passport';

export const PALETTES = ['blue', 'teal', 'green', 'white'] as const;
export type Palette = (typeof PALETTES)[number];

export function isPalette(value: string): value is Palette {
  return (PALETTES as readonly string[]).includes(value);
}

export const GUILLOCHE_TILE = { width: 240, height: 120 } as const;

const LINES = 12;
const SPACING = GUILLOCHE_TILE.height / LINES;

// Two families of hairlines, each a whole number of periods across the tile, cross into a
// security-paper weave. The extra line above and below covers waves that cross the tile edge.
const FAMILIES = [
  { periods: 2, amplitude: 4, phase: 0 },
  { periods: 3, amplitude: 3, phase: Math.PI },
] as const;

const COLORS: Record<Palette, readonly [string, string]> = {
  blue: [BRAND.ocean, BRAND.sky],
  teal: [BRAND.teal, BRAND.leaf],
  green: [BRAND.leaf, BRAND.lime],
  white: ['#ffffff', '#ffffff'],
};

export function guillocheSvg(palette: Palette): string {
  const { width, height } = GUILLOCHE_TILE;
  const groups = FAMILIES.map(({ periods, amplitude, phase }, f) => {
    const lines = Array.from({ length: LINES + 2 }, (_, i) =>
      waveLinePath({
        y: (i - 1) * SPACING + (f * SPACING) / 2,
        amplitude,
        periods,
        width,
        step: 4,
        phase: phase + i * 0.35,
      }),
    )
      .map((d) => `<path d="${d}"/>`)
      .join('');
    return `<g stroke="${COLORS[palette][f]}">${lines}</g>`;
  }).join('');
  const opacity = palette === 'white' ? 0.16 : 0.5;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g fill="none" stroke-width="0.5" opacity="${opacity}">${groups}</g></svg>`;
}
