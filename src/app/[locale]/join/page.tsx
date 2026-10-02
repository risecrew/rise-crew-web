import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PlusIcon } from '@/components/icons';
import { BoardingPass } from '@/components/passport/boarding-pass';
import { DataField, DataPage } from '@/components/passport/data-page';
import { FIELD } from '@/components/passport/labels';
import { PageCover } from '@/components/site/page-cover';
import { SectionHeading } from '@/components/site/section-heading';
import { asLocale } from '@/i18n/as-locale';
import { applyCta, getBenefits, getFaqs, getRecruitment, pick } from '@/lib/content';
import { localizedAlternates } from '@/lib/metadata';

type Props = { params: Promise<{ locale: string }> };

const ELIGIBILITY = ['campus', 'types', 'others'] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Meta.join' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: localizedAlternates(locale, '/join'),
  };
}

export default async function JoinPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('Join');
  const [recruitment, benefits, faqs] = await Promise.all([
    getRecruitment(),
    getBenefits(),
    getFaqs(),
  ]);
  const cta = applyCta(recruitment);

  return (
    <main id="main">
      <PageCover title={t('title')} lead={t('lead')} />

      <section aria-label={t(`status.${recruitment.status}`)} className="bg-paper">
        <div className="mx-auto grid max-w-7xl items-start gap-10 px-5 py-20 md:px-10 md:py-24 lg:grid-cols-[1fr_auto]">
          <DataPage>
            <DataField label={FIELD.status} wide>
              {t(`status.${recruitment.status}`)}
            </DataField>
            {recruitment.status === 'open' ? (
              <DataField label={FIELD.period} wide>
                {pick(recruitment.period, locale)}
              </DataField>
            ) : null}
            {recruitment.nextNotice ? (
              <DataField label={FIELD.notice} wide>
                <span className="text-base font-normal text-ink">
                  {pick(recruitment.nextNotice, locale)}
                </span>
              </DataField>
            ) : null}
          </DataPage>
          {cta.kind === 'apply' ? <BoardingPass cta={cta} /> : null}
        </div>
      </section>

      <section aria-labelledby="eligibility-title" className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-2">
          <SectionHeading id="eligibility-title" title={t('eligibility.title')} />
          <ul className="flex flex-col divide-y divide-paper-edge border-y border-paper-edge">
            {ELIGIBILITY.map((key) => (
              <li key={key} className="py-5 text-lg break-keep text-ink">
                {t(`eligibility.${key}`)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="benefits-title" className="bg-paper">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading id="benefits-title" title={t('benefits.title')} />
          <ul className="mt-12 grid gap-x-12 md:grid-cols-2">
            {benefits.map((benefit) => (
              <li key={benefit.id} data-benefit className="border-t border-cobalt/30 py-6">
                <h3 className="font-display text-xl font-[800] break-keep text-cobalt">
                  {pick(benefit.title, locale)}
                </h3>
                <p className="mt-2 break-keep text-ink-soft">{pick(benefit.body, locale)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="faq-title" className="bg-white">
        <div className="mx-auto max-w-4xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading id="faq-title" title={t('faq.title')} />
          <ul className="mt-10 divide-y divide-paper-edge border-y border-paper-edge">
            {faqs.map((faq) => (
              <li key={faq.id}>
                <details className="group py-5">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-semibold break-keep text-cobalt [&::-webkit-details-marker]:hidden">
                    {pick(faq.question, locale)}
                    <PlusIcon className="mt-1 text-ocean transition-transform duration-200 ease-out group-open:rotate-45" />
                  </summary>
                  <p className="mt-3 break-keep text-ink-soft">{pick(faq.answer, locale)}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
