import { guillocheSvg, isPalette, PALETTES } from '@/lib/guilloche';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return PALETTES.map((palette) => ({ name: `${palette}.svg` }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const palette = (await params).name.replace(/\.svg$/, '');
  if (!isPalette(palette)) return new Response('Not found', { status: 404 });
  return new Response(guillocheSvg(palette), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
