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
  /** Darkens the photo so type can sit on it. */
  scrim?: 'bottom' | 'full';
  /**
   * Full-bleed photos sit under the site header, so their badge drops below it. 'none' when
   * the caller places the badge itself (e.g. outside a layer that scales).
   */
  badge?: 'corner' | 'under-header' | 'none';
  /**
   * The opening photo fills the whole window at a finer quality. On a window narrower than the
   * photo (a phone held upright) it is cropped at the sides, so it is drawn as wide as the
   * window is tall times the photo's own ratio, and the browser has to fetch that width.
   */
  hero?: boolean;
};

type BadgePlacement = 'corner' | 'under-header';

export function TemporaryBadge({ label, placement }: { label: string; placement: BadgePlacement }) {
  return (
    <span
      className={cn(
        'absolute z-10 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-sm',
        placement === 'corner'
          ? 'top-[clamp(10px,2cqw,24px)] right-[clamp(10px,2cqw,24px)]'
          : 'top-20 right-5 md:top-24 md:right-10',
      )}
    >
      {label}
    </span>
  );
}

export function StagePhoto({
  photo,
  locale,
  temporaryLabel,
  priority,
  className,
  scrim = 'bottom',
  badge = 'corner',
  hero = false,
}: Props) {
  return (
    <>
      <Image
        src={photo.src}
        alt={pick(photo.alt, locale)}
        fill
        priority={priority}
        sizes={
          hero
            ? `(max-aspect-ratio: ${photo.width}/${photo.height}) ${Math.ceil((100 * photo.width) / photo.height)}vh, 100vw`
            : '(min-width: 768px) 92vw, 100vw'
        }
        quality={hero ? 90 : 75}
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
      {/* The header's white type sits on the opening photo, so its top edge is shaded a little
          more, whatever the photo holds up there. */}
      {hero ? (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,rgb(7_9_15/0.55),transparent)]"
        />
      ) : null}
      {photo.temporary && badge !== 'none' ? (
        <TemporaryBadge label={temporaryLabel} placement={badge} />
      ) : null}
    </>
  );
}
