'use client';
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { cn } from '@/lib/utils';

export type BandLogo = { id: string; name: string; logo: string };

// Every logo loads at once (no lazy loading): cards scroll into view by transform, which lazy
// loading would leave blank for a moment.
// The partners' logos drift slowly sideways at the foot of the home. The list is drawn twice and the
// track moves by exactly half its width, so the loop has no seam; the second copy is hidden from
// screen readers. It stops while a pointer rests on it and with the button (anything that moves for
// more than five seconds needs a way to stop it). With reduced motion it does not move at all and
// becomes one row to scroll by hand.
export function PartnerBand({
  logos,
  pauseLabel,
  playLabel,
}: {
  logos: BandLogo[];
  pauseLabel: string;
  playLabel: string;
}) {
  const [paused, setPaused] = useState(false);

  const list = (copy: boolean) => (
    <ul
      aria-hidden={copy || undefined}
      className={cn('flex shrink-0 gap-4 pr-4', copy && 'motion-reduce:hidden')}
    >
      {logos.map((p) => (
        // Logos are made for white paper, many in dark ink, so each sits on a light card: grey at
        // rest, its own colours under the pointer.
        <li
          key={p.id}
          className="flex h-16 w-36 shrink-0 items-center justify-center rounded-lg bg-white px-4 md:h-20 md:w-44"
        >
          <img
            src={p.logo}
            alt={copy ? '' : p.name}
            className="max-h-9 w-auto max-w-full object-contain grayscale transition-[filter] duration-200 hover:grayscale-0 md:max-h-11"
          />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="relative">
      <div className="overflow-hidden mask-x-from-90% mask-x-to-100% motion-reduce:overflow-x-auto motion-reduce:mask-none">
        <div
          data-partner-track
          className={cn(
            'flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none',
            paused && '[animation-play-state:paused]',
          )}
        >
          {list(false)}
          {list(true)}
        </div>
      </div>
      <div className="shell mt-4 flex justify-end motion-reduce:hidden">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-[13px] font-semibold text-white/64 transition-colors duration-150 hover:text-white"
        >
          <svg aria-hidden viewBox="0 0 12 12" className="size-3 fill-current">
            {paused ? (
              <path d="M3 1.5v9l7.5-4.5z" />
            ) : (
              <path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" />
            )}
          </svg>
          {paused ? playLabel : pauseLabel}
        </button>
      </div>
    </div>
  );
}
