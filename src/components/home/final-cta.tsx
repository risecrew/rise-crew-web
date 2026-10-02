import { getTranslations } from 'next-intl/server';
import { BoardingPass } from '@/components/passport/boarding-pass';
import { Guilloche } from '@/components/passport/guilloche';
import { Link } from '@/i18n/navigation';
import type { ApplyCta } from '@/lib/content';

export async function FinalCta({ cta }: { cta: ApplyCta }) {
  const t = await getTranslations('Home.final');
  const ctaT = await getTranslations('Cta');
  return (
    <section
      aria-labelledby="final-title"
      className="relative isolate overflow-hidden bg-cobalt text-white"
    >
      <Guilloche palette="white" className="absolute inset-0 -z-10" />
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-5 py-24 md:px-10 md:py-32">
        <h2
          id="final-title"
          className="max-w-3xl font-display text-[clamp(2.2rem,5vw,4.5rem)] leading-none font-[850] break-keep"
        >
          {t('title')}
        </h2>
        <p className="max-w-xl text-lg break-keep text-white/85">{t('body')}</p>
        <div className="flex flex-wrap items-center gap-6">
          <BoardingPass cta={cta} />
          <Link href="/contact" className="font-semibold underline underline-offset-4">
            {ctaT('partner')}
          </Link>
        </div>
      </div>
    </section>
  );
}
