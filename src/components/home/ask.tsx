import { getTranslations } from 'next-intl/server';
import { AskButton } from '@/components/stage/ask-button';
import type { Stamp } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { Link } from '@/i18n/navigation';
import { pick, type ApplyCta } from '@/lib/content';
import { formatStampDate } from '@/lib/format';

export async function Ask({
  locale,
  cta,
  upcoming,
}: {
  locale: Locale;
  cta: ApplyCta;
  upcoming: Stamp[];
}) {
  const t = await getTranslations('Home');
  const ctaT = await getTranslations('Cta');

  return (
    <section
      data-ask
      aria-labelledby="ask-title"
      className="px-5 pt-20 pb-28 text-white md:px-10 md:pt-28 md:pb-36"
    >
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div>
          <h2
            id="ask-title"
            className="font-display text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.98] font-[850] text-balance break-keep"
          >
            {t('ask.title')}
          </h2>
          <p className="mt-5 text-lg break-keep text-white/80">{t('ask.body')}</p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <AskButton cta={cta} />
            <Link href="/contact" className="font-semibold underline underline-offset-4">
              {ctaT('partner')}
            </Link>
          </div>
        </div>
        {upcoming.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold text-white/75">{t('ask.next')}</h3>
            <ol className="mt-2 divide-y divide-white/15 border-y border-white/15">
              {upcoming.map((s) => (
                <li key={s.id} className="flex gap-4 py-3">
                  <span className="w-[8ch] shrink-0 font-mono text-white/70">
                    {s.date ? formatStampDate(s.date, locale) : ''}
                  </span>
                  <span className="break-keep">{pick(s.title, locale)}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </section>
  );
}
