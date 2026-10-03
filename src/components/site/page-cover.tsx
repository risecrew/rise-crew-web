import type { ReactNode } from 'react';
import { Screen } from '@/components/stage/screen';
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

// Title slide for inner pages: the headline on the dark stage, a real photo on the screen.
export function PageCover({ title, lead, photo, children }: Props) {
  return (
    <section data-page-cover className="relative isolate overflow-hidden bg-stage text-white">
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,rgb(0_62_145/0.55),transparent_70%)]"
      />
      <div
        className={cn(
          'mx-auto grid max-w-7xl items-end gap-10 px-5 pt-32 pb-16 md:px-10 md:pt-40 md:pb-24',
          photo && 'lg:grid-cols-[1fr_1.15fr]',
        )}
      >
        <div>
          <h1 className="font-display text-[clamp(2.4rem,6vw,5.5rem)] leading-[0.98] font-[850] text-balance break-keep">
            {title}
          </h1>
          {lead ? <p className="mt-6 max-w-2xl text-lg break-keep text-white/80">{lead}</p> : null}
          {children}
        </div>
        {photo ? (
          <Screen className="max-w-none md:aspect-video">
            <StagePhoto
              photo={photo.photo}
              locale={photo.locale}
              temporaryLabel={photo.temporaryLabel}
              priority
            />
          </Screen>
        ) : null}
      </div>
    </section>
  );
}
