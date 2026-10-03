import Image from 'next/image';
import type { Photo } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { pick } from '@/lib/content';
import { cn } from '@/lib/utils';

type Props = {
  photo: Photo;
  locale: Locale;
  temporaryLabel: string;
  priority?: boolean;
  className?: string;
  /** Darkens the photo so slide type can sit on it. */
  scrim?: 'bottom' | 'full';
};

export function StagePhoto({
  photo,
  locale,
  temporaryLabel,
  priority,
  className,
  scrim = 'bottom',
}: Props) {
  return (
    <>
      <Image
        src={photo.src}
        alt={pick(photo.alt, locale)}
        fill
        priority={priority}
        sizes="(min-width: 768px) 92vw, 100vw"
        className={cn('object-cover', className)}
      />
      <div
        aria-hidden
        className={cn(
          'absolute inset-0',
          scrim === 'full'
            ? 'bg-[linear-gradient(180deg,rgb(0_20_60/0.55),rgb(0_30_80/0.82))]'
            : 'bg-[linear-gradient(180deg,rgb(7_9_15/0.15)_0%,rgb(7_9_15/0.25)_45%,rgb(7_9_15/0.88)_100%)]',
        )}
      />
      {photo.temporary ? (
        <span className="absolute top-[clamp(10px,2cqw,24px)] right-[clamp(10px,2cqw,24px)] z-10 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
          {temporaryLabel}
        </span>
      ) : null}
    </>
  );
}
