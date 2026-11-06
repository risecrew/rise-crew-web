import Image from 'next/image';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  name: string;
  tagline: string;
  // The team's field and cohort, already in words.
  facts: string;
  // The team's logo, when it has one.
  logo?: ReactNode;
  // A photo from the team's latest public post. It fills the scene the way a real photo does on the
  // rest of the site. Without one the cover stays short, so the intro and posts are near the top.
  photo: string | null;
  badge?: ReactNode;
  // What the visitor can do here, if anything.
  actions?: ReactNode;
};

// The opening of a team's page: the logo and name together as the team's own mark, its one line
// under them, and its buttons at the far end on a wide screen.
export function TeamCover({ name, tagline, facts, logo, photo, badge, actions }: Props) {
  return (
    <section
      data-team-cover
      className={cn(
        'relative isolate flex items-end overflow-hidden bg-stage text-white',
        photo && 'min-h-[560px] md:h-[76svh]',
      )}
    >
      {photo ? (
        <>
          <Image src={photo} alt="" fill unoptimized priority className="-z-20 object-cover" />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(7_9_15/0.6)_0%,rgb(7_9_15/0.3)_28%,rgb(7_9_15/0.72)_58%,rgb(7_9_15/0.96)_100%)]"
          />
        </>
      ) : (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(ellipse_75%_90%_at_50%_0%,rgb(0_62_145/0.6),transparent_70%)]"
        />
      )}

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 pt-32 pb-10 md:flex-row md:items-end md:justify-between md:gap-10 md:px-10 md:pb-14">
        <div className="min-w-0">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-7">
            {logo}
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-3 text-sm font-medium text-white/85">
                {facts}
                {badge}
              </p>
              <h1 className="mt-2 font-display text-[clamp(2.75rem,7vw,6rem)] leading-[0.95] font-[900] tracking-[-0.025em] text-balance wrap-anywhere break-keep">
                {name}
              </h1>
            </div>
          </div>
          {tagline ? (
            <p className="mt-6 max-w-2xl text-lg wrap-anywhere break-keep text-white/90 md:text-xl">
              {tagline}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>
        ) : null}
      </div>
    </section>
  );
}
