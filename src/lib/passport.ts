import type { Locale } from '@/i18n/locales';

type WaveLineOptions = {
  y: number;
  amplitude: number;
  periods: number;
  width: number;
  step: number;
  phase?: number;
};

// One hairline of the security-paper weave. A whole number of periods across the tile
// width makes the line end at the height it starts, so the tile repeats without a seam.
export function waveLinePath({
  y,
  amplitude,
  periods,
  width,
  step,
  phase = 0,
}: WaveLineOptions): string {
  if (!Number.isInteger(periods) || periods < 1) {
    throw new RangeError('periods must be a positive whole number');
  }
  let d = '';
  for (let x = 0; x <= width; x += step) {
    const yy = y + amplitude * Math.sin((x / width) * periods * Math.PI * 2 + phase);
    d += `${x === 0 ? 'M' : 'L'}${x} ${yy.toFixed(2)}`;
  }
  return d;
}

export function toMrz(fields: readonly string[], width = 44): string {
  const encoded = fields
    .map((field) =>
      field
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '<')
        .replace(/^<+|<+$/g, ''),
    )
    .filter(Boolean)
    .join('<<');
  return encoded.length >= width ? encoded.slice(0, width) : encoded.padEnd(width, '<');
}

function hashId(id: string): number {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

export function stampRotation(id: string): number {
  return (hashId(id) % 11) - 5;
}

export const STAMP_SHAPES = ['circle', 'oval', 'rect', 'hexagon'] as const;
export type StampShape = (typeof STAMP_SHAPES)[number];

export function stampShape(id: string): StampShape {
  return STAMP_SHAPES[Math.floor(hashId(id) / 11) % STAMP_SHAPES.length];
}

export type StampScale = 'sm' | 'md' | 'lg';

export function stampScale(id: string): StampScale {
  return (['sm', 'md', 'lg'] as const)[Math.floor(hashId(id) / 44) % 3];
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function formatStampDate(date: string, locale: Locale): string {
  const [year, month, day] = date.split('-');
  if (!month) return year;
  if (locale === 'ko') return day ? `${year}.${month}.${day}` : `${year}.${month}`;
  const name = MONTHS[Number(month) - 1];
  return day ? `${Number(day)} ${name} ${year}` : `${name} ${year}`;
}
