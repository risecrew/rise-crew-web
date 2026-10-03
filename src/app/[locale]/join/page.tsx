import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PlusIcon } from '@/components/icons';
import { PageCover } from '@/components/site/page-cover';
import { SectionHeading } from '@/components/site/section-heading';
import { AskButton } from '@/components/stage/ask-button';
import { Fact, FactList } from '@/components/stage/facts';
import { FIELD } from '@/components/stage/labels';
import { asLocale } from '@/i18n/as-locale';
import { applyCta, getBenefits, getFaqs, getPhoto, getRecruitment, pick } from '@/lib/content';
import { localizedAlternates } from '@/lib/metadata';

type Props = { params: Promise<{ locale: string }> };

const ELIGIBILITY = ['campus', 'types', 'others'] as const;
const SECTION = 'border-t border-white/10 bg-stage text-white';

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
  const home = await getTranslations('Home');
  const [recruitment, benefits, faqs, photo] = await Promise.all([
    getRecruitment(),
    getBenefits(),
    getFaqs(),
    getPhoto('sushi-tech-tokyo-2026'),
  ]);
  const cta = applyCta(recruitment);

  return (
    <main id="main" className="bg-stage">
      <PageCover
        title={t('title')}
        lead={t('lead')}
        photo={photo ? { photo, locale, temporaryLabel: home('deck.temporary') } : undefined}
      />

      <section aria-label={t(`status.${recruitment.status}`)} className={SECTION}>
        <div className="mx-auto grid max-w-7xl items-start gap-10 px-5 py-20 md:px-10 md:py-24 lg:grid-cols-[1fr_auto]">
          <FactList>
            <Fact label={pick(FIELD.status, locale)}>{t(`status.${recruitment.status}`)}</Fact>
            {recruitment.status === 'open' ? (
              <Fact label={pick(FIELD.period, locale)}>{pick(recruitment.period, locale)}</Fact>
            ) : null}
            {recruitment.nextNotice ? (
              <Fact label={pick(FIELD.notice, locale)}>
                <span className="text-base font-normal text-white/85">
                  {pick(recruitment.nextNotice, locale)}
                </span>
              </Fact>
            ) : null}
          </FactList>
          {cta.kind === 'apply' ? <AskButton cta={cta} /> : null}
        </div>
      </section>

      <section aria-labelledby="eligibility-title" className={SECTION}>
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-2">
          <SectionHeading id="eligibility-title" title={t('eligibility.title')} />
          <ul className="border-b border-white/15">
            {ELIGIBILITY.map((key) => (
              <li
                key={key}
                className="border-t border-white/15 py-5 text-lg break-keep text-white/90"
              >
                {t(`eligibility.${key}`)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="benefits-title" className={SECTION}>
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading id="benefits-title" title={t('benefits.title')} />
          <ul className="mt-12 grid gap-x-12 md:grid-cols-2">
            {benefits.map((benefit) => (
              <li key={benefit.id} data-benefit className="border-t border-white/15 py-6">
                <h3 className="font-display text-xl font-[850] break-keep">
                  {pick(benefit.title, locale)}
                </h3>
                <p className="mt-2 break-keep text-white/75">{pick(benefit.body, locale)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="faq-title" className={SECTION}>
        <div className="mx-auto max-w-4xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading id="faq-title" title={t('faq.title')} />
          <ul className="mt-10 border-b border-white/15">
            {faqs.map((faq) => (
              <li key={faq.id} className="border-t border-white/15">
                <details className="group py-5">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-semibold break-keep [&::-webkit-details-marker]:hidden">
                    {pick(faq.question, locale)}
                    <PlusIcon className="mt-1 text-lime transition-transform duration-200 ease-out group-open:rotate-45" />
                  </summary>
                  <p className="mt-3 break-keep text-white/75">{pick(faq.answer, locale)}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
