import type { Locale } from '@/i18n/locales';

type GuillocheOptions = {
  cx: number;
  cy: number;
  radius: number;
  amplitude: number;
  petals: number;
  steps: number;
  phase?: number;
};

export function guillochePath({
  cx,
  cy,
  radius,
  amplitude,
  petals,
  steps,
  phase = 0,
}: GuillocheOptions): string {
  if (steps < 3) throw new RangeError('steps must be at least 3');
  let d = '';
  for (let i = 0; i < steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const r = radius + amplitude * Math.sin(petals * theta + phase);
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d}Z`;
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

export function stampRotation(id: string): number {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return (Math.abs(hash) % 11) - 5;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function formatStampDate(date: string, locale: Locale): string {
  const [year, month, day] = date.split('-');
  if (!month) return year;
  if (locale === 'ko') return day ? `${year}.${month}.${day}` : `${year}.${month}`;
  const name = MONTHS[Number(month) - 1];
  return day ? `${Number(day)} ${name} ${year}` : `${name} ${year}`;
}
