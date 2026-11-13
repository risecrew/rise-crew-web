/* eslint-disable @next/next/no-img-element */
import { cn } from '@/lib/utils';

export type BandLogo = { id: string; name: string; logo: string };

// The partners' logos drift slowly sideways at the foot of the home, in their own colours on one
// white strip (logos are made for white paper, many in dark ink, some with white baked in). The list
// is drawn twice and the track moves by exactly half its width, so the loop has no seam; the second
// copy is hidden from screen readers. It stops while a pointer rests on it. With reduced motion it
// does not move at all and becomes one row to scroll by hand. Every logo loads at once (no lazy
// loading): logos come into view by transform, which lazy loading would leave blank for a moment.
export function PartnerBand({ logos }: { logos: BandLogo[] }) {
  const list = (copy: boolean) => (
    <ul
      aria-hidden={copy || undefined}
      className={cn(
        'flex shrink-0 items-center gap-12 pr-12 md:gap-16 md:pr-16',
        copy && 'motion-reduce:hidden',
      )}
    >
      {logos.map((p) => (
        <li
          key={p.id}
          className="flex h-12 w-32 shrink-0 items-center justify-center md:h-14 md:w-40"
        >
          <img
            src={p.logo}
            alt={copy ? '' : p.name}
            className="max-h-full w-auto max-w-full object-contain"
          />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="bg-white py-8 md:py-10">
      <div className="overflow-hidden mask-x-from-92% mask-x-to-100% motion-reduce:overflow-x-auto motion-reduce:mask-none">
        <div
          data-partner-track
          className="flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none"
        >
          {list(false)}
          {list(true)}
        </div>
      </div>
    </div>
  );
}
