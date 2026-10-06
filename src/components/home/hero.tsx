import { getTranslations } from 'next-intl/server';
import { AskButton } from '@/components/stage/ask-button';
import { HeroStage } from '@/components/stage/hero-stage';
import { StagePhoto } from '@/components/stage/stage-photo';
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
          />
        ) : null
      }
    >
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-8 px-5 pb-14 md:flex-row md:items-end md:justify-between md:px-10 md:pb-16">
        <div>
          <h1
            lang="en"
            className="font-display text-[clamp(2.6rem,7.4vw,6rem)] leading-[0.95] font-[850] tracking-[-0.02em] text-white"
          >
            {SLOGAN.map(([initial, rest]) => (
              <span key={initial} className="block">
                <span className="text-lime">{initial}</span>
                {rest}
              </span>
            ))}
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
