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

// Global gallery. Positions are measured in cities: city i is read at position i, and each
// city gets one screen of scroll. The change happens early in that screen; the rest holds.
const GALLERY_TAIL = 0.3; // extra hold after the last city
const PHOTO_IN = [-0.75, -0.4] as const; // the photo wipes up from the bottom
const CAPTION_IN = [-0.55, -0.35] as const; // the new caption comes up after the old one is gone
const CAPTION_OUT = [0.25, 0.42] as const;
const CAPTION_RISE = 48; // px

export type Frames = { input: number[]; opacity: number[]; y: number[] };

export function galleryLength(count: number): number {
  return Math.max(0, count - 1) + GALLERY_TAIL;
}

export function galleryCity(position: number, count: number): number {
  // City i takes over midway between the old caption leaving and the new one arriving.
  const handover = (CAPTION_OUT[1] - 1 + CAPTION_IN[0]) / 2;
  return Math.min(count - 1, Math.max(0, Math.floor(position - handover)));
}

export function galleryPhotoRange(index: number): [number, number] {
  return [index + PHOTO_IN[0], index + PHOTO_IN[1]];
}

export function galleryCaptionFrames(index: number, count: number): Frames {
  const input: number[] = [];
  const opacity: number[] = [];
  const y: number[] = [];
  if (index > 0) {
    input.push(index + CAPTION_IN[0], index + CAPTION_IN[1]);
    opacity.push(0, 1);
    y.push(CAPTION_RISE, 0);
  }
  if (index < count - 1) {
    input.push(index + CAPTION_OUT[0], index + CAPTION_OUT[1]);
    opacity.push(1, 0);
    y.push(0, -CAPTION_RISE);
  }
  if (input.length === 0) return { input: [0, 1], opacity: [1, 1], y: [0, 0] };
  return { input, opacity, y };
}

export function gallerySnapPoints(count: number): number[] {
  return Array.from({ length: count }, (_, i) => Math.max(0, i - 0.1));
}
