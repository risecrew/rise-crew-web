export type StatCount = { number: number; suffix: string };

// "90+" → { number: 90, suffix: "+" }. Values that are not counts return null and render as text.
export function parseStatValue(value: string): StatCount | null {
  const match = value.match(/^(\d+)(\D*)$/);
  return match ? { number: Number(match[1]), suffix: match[2] } : null;
}

// Exponential ease-out: fast start, long settle, exactly 1 at the end.
export function easeOutExpo(progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// Every counter shares this curve and duration, so they land on their targets together.
export function countUpValue(target: number, progress: number): number {
  return Math.round(target * easeOutExpo(progress));
}

export function slideCounter(current: number, total: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(current)} / ${pad(total)}`;
}
