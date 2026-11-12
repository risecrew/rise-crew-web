import { getTranslations } from 'next-intl/server';
import { PRIMARY } from '@/components/site/buttons';
import type { Recruitment } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { NextNotice } from '@/components/site/next-notice';
import { Link } from '@/i18n/navigation';
import { pick } from '@/lib/content';

// S6 (wireframe v1.1, §8): whether we are recruiting, who can apply, and the way to the join page.
// A row with no value is left out.
export async function Recruit({
  locale,
  recruitment,
  applyLabel,
}: {
  locale: Locale;
  recruitment: Recruitment;
  applyLabel: string;
}) {
  const t = await getTranslations('Home.recruit');
  const open = recruitment.status === 'open';
  const rows = [
    { label: t('who'), value: t('whoValue') },
    ...(open ? [{ label: t('period'), value: pick(recruitment.period, locale) }] : []),
    // TODO(운영진 확인): the selection steps, once confirmed (wireframe v1.1, §8 6-3).
  ];

  return (
    <section aria-labelledby="recruit-title" className="bg-cobalt/25 section-y text-white">
      <div className="shell grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-start">
        <div>
          {/* Open recruiting gets a lime mark; a closed one says so in the title alone. */}
          {open ? (
            <p className="mb-4 inline-flex rounded-full bg-lime px-3 py-1 text-[13px] font-semibold text-cobalt">
              {t('badge.open')}
            </p>
          ) : null}
          <h2 id="recruit-title" className="font-display text-headline text-balance break-keep">
            {open ? t('title.open') : t('title.closed')}
          </h2>
          {/* Who can apply is in the list beside; under the title, when the next round opens and
              where it will be announced. */}
          {recruitment.nextNotice ? (
            <div className="mt-5">
              <NextNotice notice={recruitment.nextNotice} locale={locale} />
            </div>
          ) : !open ? (
            <p className="mt-4 text-lg break-keep text-white/80">{t('closedBody')}</p>
          ) : null}
          <div className="mt-8">
            <Link href="/join" className={PRIMARY}>
              {applyLabel}
            </Link>
          </div>
        </div>
        <dl className="grid gap-4 border-t border-white/15 pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-10">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-[13px] font-semibold text-white/64">{row.label}</dt>
              <dd className="mt-1 text-base break-keep">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
