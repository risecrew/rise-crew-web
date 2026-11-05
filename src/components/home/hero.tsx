import { getTranslations } from 'next-intl/server';
import { AskButton } from '@/components/stage/ask-button';
import { HeroStage } from '@/components/stage/hero-stage';
import { StagePhoto, TemporaryBadge } from '@/components/stage/stage-photo';
import type { Photo } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { Link } from '@/i18n/navigation';
import type { ApplyCta } from '@/lib/content';

const SLOGAN = [
  ['R', 'each your vision,'],
  ['I', 'gnite your idea,'],
  ['S', 'cale up your impact,'],
  ['E', 'levate your future.'],
] as const;

export async function Hero({
  locale,
  photo,
  cta,
}: {
  locale: Locale;
  photo: Photo | undefined;
  cta: ApplyCta;
}) {
  const t = await getTranslations('Home');
  const common = await getTranslations('Common');
  const ctaT = await getTranslations('Cta');

  return (
    <HeroStage
      photo={
        photo ? (
          <StagePhoto
            photo={photo}
            locale={locale}
            temporaryLabel={common('temporaryPhoto')}
            priority
            hero
            badge="none"
          />
        ) : null
      }
      badge={
        photo?.temporary ? (
          <TemporaryBadge label={common('temporaryPhoto')} placement="under-header" />
        ) : null
      }
    >
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-8 px-5 pb-14 md:flex-row md:items-end md:justify-between md:px-10 md:pb-16">
        <div>
          <h1 lang="en" className="font-display text-hero text-white">
            {/* Read as four plain lines; the split below is only how they are drawn. */}
            {SLOGAN.map(([initial, rest]) => (
              <span key={initial} className="sr-only">
                {initial + rest}{' '}
              </span>
            ))}
            {/* The initials stand in a column of their own, each centred in it, so they stack
                into the word RISE (the narrow I no longer drifts left). They carry the full size
                at the heaviest weight; the rest of each line steps down to 0.8 of it. The R's ink
                starts 0.05em inside its box, so the column moves left by that much: the R then
                stands on the same line as the logo above and the sentence below. */}
            <span
              aria-hidden
              className="-ml-[0.05em] grid grid-cols-[auto_1fr] items-baseline gap-x-[0.14em]"
            >
              {SLOGAN.map(([initial, rest]) => (
                <span key={initial} className="contents">
                  <span className="justify-self-center font-[1000] text-lime">{initial}</span>
                  <span className="text-[0.8em] font-[750]">{rest}</span>
                </span>
              ))}
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base break-keep text-white/85 md:text-lg">
            {t('cover.subline')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-6">
          <Link href="/contact" className="font-semibold text-white underline underline-offset-4">
            {ctaT('partner')}
          </Link>
          <AskButton cta={cta} />
        </div>
      </div>
    </HeroStage>
  );
}
