import type { ReactNode } from 'react';
import { StagePhoto } from '@/components/stage/stage-photo';
import type { Photo } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  lead?: string;
  photo?: { photo: Photo; locale: Locale; temporaryLabel: string };
  children?: ReactNode;
};

// Inner pages open the way the home's chapters do: a photo from edge to edge with the title
// set on it. Without a photo (404) the title sits on the dark stage under a cobalt light.
export function PageCover({ title, lead, photo, children }: Props) {
  return (
    <section
      data-page-cover
      className={cn(
        'relative isolate flex items-end overflow-hidden bg-stage text-white',
        photo ? 'h-[78svh] min-h-[560px] md:h-[88svh]' : 'min-h-[70svh]',
      )}
    >
      {photo ? (
        <StagePhoto
          photo={photo.photo}
          locale={photo.locale}
          temporaryLabel={photo.temporaryLabel}
          priority
          badge="under-header"
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,rgb(0_62_145/0.55),transparent_70%)]"
        />
      )}
      <div className="relative w-full px-5 pt-32 pb-14 md:px-10 md:pb-20">
        <div className="mx-auto max-w-7xl">
          <h1 className="max-w-5xl font-display text-[clamp(3rem,8.5vw,8rem)] leading-[0.92] font-[900] tracking-[-0.025em] text-balance break-keep">
            {title}
          </h1>
          {lead ? (
            <p className="mt-6 max-w-2xl text-lg break-keep text-white/85 md:text-xl">{lead}</p>
          ) : null}
          {children}
        </div>
      </div>
    </section>
  );
}
