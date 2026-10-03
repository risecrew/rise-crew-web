import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageCover } from '@/components/site/page-cover';
import { SectionHeading } from '@/components/site/section-heading';
import { Fact, FactList } from '@/components/stage/facts';
import { FIELD } from '@/components/stage/labels';
import { Timeline } from '@/components/stage/timeline';
import { asLocale } from '@/i18n/as-locale';
import {
  getGrowthSteps,
  getMentors,
  getOfficers,
  getPhoto,
  getPrograms,
  getStamps,
  pick,
} from '@/lib/content';
import { localizedAlternates } from '@/lib/metadata';

export const revalidate = 86400;

type Props = { params: Promise<{ locale: string }> };

const SECTION = 'border-t border-white/10 bg-stage text-white';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Meta.about' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: localizedAlternates(locale, '/about'),
  };
}

export default async function AboutPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('About');
  const home = await getTranslations('Home');
  const [steps, programs, officers, mentors, stamps, photo] = await Promise.all([
    getGrowthSteps(),
    getPrograms(),
    getOfficers(),
    getMentors(),
    getStamps(),
    getPhoto('smu-vibe-coding-2025-12'),
  ]);
  const advisor = mentors.find((m) => m.id === 'shin-dongwon');
  const rise = (['r', 'i', 's', 'e'] as const).map((key) => t(`rise.${key}`));

  return (
    <main id="main" className="bg-stage">
      <PageCover
        title={t('title')}
        lead={t('lead')}
        photo={photo ? { photo, locale, temporaryLabel: home('deck.temporary') } : undefined}
      />

      <section aria-labelledby="rise-title" className={SECTION}>
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-2">
          <SectionHeading id="rise-title" title={t('rise.title')} body={t('rise.born')} />
          <ol className="border-b border-white/15">
            {rise.map((line) => (
              <li
                key={line}
                className="border-t border-white/15 py-5 font-display text-[clamp(1.6rem,3vw,2.6rem)] font-[850] break-keep"
              >
                <span className="text-lime">{line.slice(0, 1)}</span>
                {line.slice(1)}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="supporter-title" className={SECTION}>
        <div className="mx-auto grid max-w-7xl items-start gap-12 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-2">
          <SectionHeading
            id="supporter-title"
            title={t('supporter.title')}
            body={t('supporter.body')}
          />
          <FactList>
            <Fact label={t('supporter.kpiLabel')}>{t('supporter.kpiFunding')}</Fact>
            <Fact label={t('supporter.kpiLabel')}>{t('supporter.kpiGlobal')}</Fact>
            <Fact label={pick(FIELD.period, locale)}>2025.06 – 2030.02</Fact>
            <Fact label={pick(FIELD.brand, locale)}>
              <span lang="en">SKKU with Seoul, My Soulmate</span>
            </Fact>
          </FactList>
        </div>
      </section>

      <section aria-labelledby="steps-title" className={SECTION}>
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading id="steps-title" title={t('steps.title')} body={t('steps.body')} />
          {/* The order is the information here, so the steps keep their numbers. */}
          <ol className="mt-12 grid gap-8 md:grid-cols-5 md:gap-6">
            {steps.map((step) => (
              <li key={step.id} data-step className="border-t-2 border-lime pt-5">
                <p className="font-mono text-sm text-lime">{String(step.order).padStart(2, '0')}</p>
                <p lang="en" className="mt-2 font-display text-xl font-[850]">
                  {pick(step.name, locale)}
                </p>
                <p className="mt-2 text-sm break-keep text-white/75">
                  {pick(step.summary, locale)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="programs-title" className={SECTION}>
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading id="programs-title" title={t('programs.title')} />
          <ul className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {programs.map((program) => (
              <li key={program.id} className="border-t border-white/15 pt-5">
                <h3 className="font-display text-2xl font-[850] break-keep">
                  {pick(program.name, locale)}
                </h3>
                <p className="mt-2 break-keep text-white/75">{pick(program.summary, locale)}</p>
                {program.details.length > 0 ? (
                  <ul className="mt-4 flex flex-col gap-2 text-sm break-keep text-white/85">
                    {program.details.map((detail) => (
                      <li key={detail.en} className="border-l border-white/25 pl-3">
                        {pick(detail, locale)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="crew-title" className={SECTION}>
        <div className="mx-auto grid max-w-7xl items-start gap-12 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-2">
          <SectionHeading id="crew-title" title={t('crew.title')} body={t('crew.pending')} />
          <div>
            {advisor ? (
              <FactList columns={2}>
                <Fact label={pick(FIELD.role, locale)}>{t('crew.advisor')}</Fact>
                <Fact label={pick(FIELD.person, locale)}>{pick(advisor.name, locale)}</Fact>
              </FactList>
            ) : null}
            <ul className="mt-6 flex flex-wrap gap-2">
              {officers.map((officer) => (
                <li
                  key={officer.id}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold"
                >
                  {pick(officer.role, locale)}
                  {officer.consent && officer.name ? ` · ${pick(officer.name, locale)}` : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="history-title" className={SECTION}>
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading id="history-title" title={t('history.title')} />
          <Timeline events={stamps} locale={locale} today={new Date()} className="mt-10" />
        </div>
      </section>
    </main>
  );
}
