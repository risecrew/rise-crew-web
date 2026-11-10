import Image from 'next/image';
import type { ReactNode } from 'react';
import type { Photo } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { pick } from '@/lib/content';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  /** The page's name in small type above the title, when the title is not the name itself. */
  eyebrow?: string;
  lead?: string;
  photo?: { photo: Photo; locale: Locale; temporaryLabel?: string };
  children?: ReactNode;
};

// Every inner page opens the same way (wireframe v1.1, §9 A1): the page's name, its title, a line
// or two, and a photo behind them only when the page has one of its own.
export function PageCover({ title, eyebrow, lead, photo, children }: Props) {
  return (
    <section
      data-page-cover
      data-photo-hero={photo ? '' : undefined}
      className={cn(
        'relative isolate overflow-hidden bg-stage text-white',
        photo
          ? 'flex min-h-[420px] items-end pt-32 pb-14 md:min-h-[520px] md:pb-20'
          : 'pt-[128px] pb-[72px] md:pt-[192px] md:pb-24',
      )}
    >
      {photo ? (
        <>
          <Image
            src={photo.photo.src}
            alt={pick(photo.photo.alt, photo.locale)}
            fill
            priority
            sizes="100vw"
            quality={75}
            className="-z-10 object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(7_9_15/0.35),rgb(7_9_15/0.88))]"
          />
        </>
      ) : (
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,rgb(0_62_145/0.45),transparent_70%)]"
        />
      )}
      <div className="relative shell w-full">
        {eyebrow ? <p className="mb-3 text-[15px] font-semibold text-white/80">{eyebrow}</p> : null}
        <h1 className="max-w-4xl font-display text-display text-balance break-keep">{title}</h1>
        {lead ? <p className="mt-5 max-w-2xl text-lg break-keep text-white/80">{lead}</p> : null}
        {children}
      </div>
    </section>
  );
}
