import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { PRIMARY, SECONDARY } from '@/components/site/buttons';
import type { Photo, Stamp } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { Link } from '@/i18n/navigation';
import { pick } from '@/lib/content';
import { formatCaption } from '@/lib/format';

// S1 (wireframe v1.1, §8): who we are, in one screen. The photo holds still; the page scrolls past
// it like any other section.
export async function Hero({
  locale,
  photo,
  event,
  teams,
  applyLabel,
}: {
  locale: Locale;
  photo: Photo | undefined;
  event: Stamp | undefined;
  teams: string;
  applyLabel: string;
}) {
  const t = await getTranslations('Home.hero');
  const [first, second] = t('title').split('\n');

  return (
    <section
      data-hero
      data-photo-hero={photo ? '' : undefined}
      aria-labelledby="hero-title"
      className="relative isolate flex h-[88svh] min-h-[560px] items-end overflow-hidden bg-stage text-white md:h-[min(100svh,880px)]"
    >
      {photo ? (
        <>
          <Image
            src={photo.src}
            alt={pick(photo.alt, locale)}
            fill
            priority
            sizes="100vw"
            quality={75}
            className="-z-10 object-cover"
          />
          {/* Dark at the top so the header reads over any photo, and from the middle down to the
              stage colour itself, so the words read and the photo ends with no seam. */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 -z-10 h-40 bg-[linear-gradient(180deg,rgb(7_9_15/0.75),transparent)]"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 -z-10 h-[75%] bg-[linear-gradient(180deg,transparent,rgb(7_9_15/0.7)_45%,var(--color-stage))]"
          />
        </>
      ) : null}
      <div className="relative shell pb-14 md:pb-20">
        {/* The club line in lime behind a short rule, the name large, the team count in lime: the
            three things a first visitor should take away. */}
        <p className="flex items-center gap-3 text-[15px] font-semibold break-keep text-lime sm:text-base md:text-xl">
          <span aria-hidden className="hidden h-0.5 w-8 shrink-0 bg-lime sm:block md:w-10" />
          {t('eyebrow')}
        </p>
        <h1 id="hero-title" className="mt-4 font-display text-wordmark text-balance break-keep">
          {first}
          {second ? (
            <>
              <br />
              {second}
            </>
          ) : null}
        </h1>
        {/* One sentence to a line, so neither breaks in the middle. */}
        <p className="mt-6 text-base break-keep text-white/80 md:text-lg">
          <span className="block">{t('body')}</span>
          <span className="block">
            {t.rich('teams', {
              teams,
              em: (chunks) => <strong className="font-semibold text-lime">{chunks}</strong>,
            })}
          </span>
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/join" className={PRIMARY}>
            {applyLabel}
          </Link>
          <a href="#contact" className={SECONDARY}>
            {t('partner')}
          </a>
        </div>
      </div>
      {photo && event ? (
        <p className="absolute right-6 bottom-6 hidden text-sm text-white/64 md:block">
          {formatCaption(event, locale)}
        </p>
      ) : null}
    </section>
  );
}
