import { TEAM_LIMITS } from './forms';

const PHOTO_SIDE = 2000;
const COVER_SIDE = 2400;
const LOGO_SIDE = 800;
const JPEG_QUALITIES = [0.85, 0.72, 0.6];

export type ImageKind = 'photo' | 'cover' | 'logo';

const SETTINGS: Record<ImageKind, { side: number; maxBytes: number }> = {
  photo: { side: PHOTO_SIDE, maxBytes: TEAM_LIMITS.photoBytes },
  cover: { side: COVER_SIDE, maxBytes: TEAM_LIMITS.coverBytes },
  logo: { side: LOGO_SIDE, maxBytes: TEAM_LIMITS.logoBytes },
};

// The size a picture is drawn at: its longer side brought down to `max`, its shape kept.
export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function load(file: File): Promise<HTMLImageElement | null> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Draws a picture again at a sensible size before it goes up. A phone's photo fits the limits and
// loads quickly on a phone afterwards, and because only the pixels are drawn, what the file said
// about itself, such as where it was taken, stays behind. The browser applies the photo's rotation
// while drawing it. A logo keeps its transparency; everything else becomes a JPEG on white.
export async function shrinkImage(
  file: File,
  kind: ImageKind,
): Promise<{ blob: Blob } | { error: 'unreadable' | 'tooLarge' }> {
  const image = await load(file);
  if (!image || image.naturalWidth === 0) return { error: 'unreadable' };

  const { side, maxBytes } = SETTINGS[kind];
  const canvas = document.createElement('canvas');
  const size = fitWithin(image.naturalWidth, image.naturalHeight, side);
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) return { error: 'unreadable' };

  if (kind === 'logo') {
    context.drawImage(image, 0, 0, size.width, size.height);
    const png = await toBlob(canvas, 'image/png');
    if (png && png.size <= maxBytes) return { blob: png };
    context.globalCompositeOperation = 'destination-over';
  }
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size.width, size.height);
  if (kind !== 'logo') context.drawImage(image, 0, 0, size.width, size.height);

  for (const quality of JPEG_QUALITIES) {
    const jpeg = await toBlob(canvas, 'image/jpeg', quality);
    if (jpeg && jpeg.size <= maxBytes) return { blob: jpeg };
  }
  return { error: 'tooLarge' };
}
