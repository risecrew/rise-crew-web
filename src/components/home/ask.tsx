import { getTranslations } from 'next-intl/server';
import { AskButton } from '@/components/stage/ask-button';
import { Link } from '@/i18n/navigation';
import type { ApplyCta } from '@/lib/content';

export async function Ask({ cta }: { cta: ApplyCta }) {
  const t = await getTranslations('Home');
  const ctaT = await getTranslations('Cta');

  return (
    <section
      data-ask
      aria-labelledby="ask-title"
      className="px-5 pt-20 pb-28 text-white md:px-10 md:pt-28 md:pb-36"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center text-center">
        <h2 id="ask-title" className="font-display text-headline text-balance break-keep">
          {t('ask.title')}
        </h2>
        <p className="mt-5 text-lg break-keep text-white/80">{t('ask.body')}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
          <AskButton cta={cta} />
          <Link href="/contact" className="font-semibold underline underline-offset-4">
            {ctaT('partner')}
          </Link>
        </div>
      </div>
    </section>
  );
}
