import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DataField, DataPage } from '@/components/passport/data-page';
import { FIELD } from '@/components/passport/labels';
import { Stamp } from '@/components/passport/stamp';
import { getStampLabels } from '@/components/passport/stamp-labels';
import { StampTrail } from '@/components/passport/stamp-trail';
import { PageCover } from '@/components/site/page-cover';
import { SectionHeading } from '@/components/site/section-heading';
import { asLocale } from '@/i18n/as-locale';
import {
  getGrowthSteps,
  getMentors,
  getOfficers,
  getPrograms,
  getStamps,
  pick,
  stampState,
} from '@/lib/content';
import { localizedAlternates } from '@/lib/metadata';
import { toMrz } from '@/lib/passport';

export const revalidate = 86400;

type Props = { params: Promise<{ locale: string }> };

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
  const labels = await getStampLabels();
  const [steps, programs, officers, mentors, stamps] = await Promise.all([
    getGrowthSteps(),
    getPrograms(),
    getOfficers(),
    getMentors(),
    getStamps(),
  ]);
  const advisor = mentors.find((m) => m.id === 'shin-dongwon');
  const today = new Date();
  const rise = (['r', 'i', 's', 'e'] as const).map((key) => t(`rise.${key}`));

  return (
    <main id="main">
      <PageCover title={t('title')} lead={t('lead')} />

      <section aria-labelledby="rise-title" className="bg-paper">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-2">
          <SectionHeading id="rise-title" title={t('rise.title')} body={t('rise.born')} />
          <ol className="flex flex-col divide-y divide-paper-edge border-y border-paper-edge">
            {rise.map((line) => (
              <li
                key={line}
                className="py-5 font-display text-2xl font-[800] break-keep text-cobalt"
              >
                <span className="text-ocean">{line.slice(0, 1)}</span>
                {line.slice(1)}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="supporter-title" className="bg-white">
        <div className="mx-auto grid max-w-7xl items-start gap-12 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-2">
          <SectionHeading
            id="supporter-title"
            title={t('supporter.title')}
            body={t('supporter.body')}
          />
          <DataPage mrz={toMrz(['SKKU', 'ANCHOR', '2025', '2030'])}>
            <DataField label={FIELD.goal} wide>
              {t('supporter.kpiFunding')}
            </DataField>
            <DataField label={FIELD.goal} wide>
              {t('supporter.kpiGlobal')}
            </DataField>
            <DataField label={FIELD.period} wide>
              2025.06 – 2030.02
            </DataField>
            <DataField label={FIELD.brand} wide>
              <span lang="en">SKKU with Seoul, My Soulmate</span>
            </DataField>
          </DataPage>
        </div>
      </section>

      <section aria-labelledby="steps-title" className="bg-paper">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading id="steps-title" title={t('steps.title')} body={t('steps.body')} />
          {/* The order is the information here, so the steps keep their numbers. */}
          <ol className="mt-12 grid gap-8 md:grid-cols-5 md:gap-6">
            {steps.map((step) => (
              <li key={step.id} data-step className="border-t border-cobalt/40 pt-5">
                <p className="font-mono text-sm text-ocean">
                  {String(step.order).padStart(2, '0')}
                </p>
                <p lang="en" className="mt-2 font-display text-xl font-[800] text-cobalt">
                  {pick(step.name, locale)}
                </p>
                <p className="mt-2 text-sm break-keep text-ink-soft">
                  {pick(step.summary, locale)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="programs-title" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading id="programs-title" title={t('programs.title')} />
          <ul className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {programs.map((program) => (
              <li key={program.id} className="border-t border-cobalt/40 pt-5">
                <h3 className="font-display text-2xl font-[800] break-keep text-cobalt">
                  {pick(program.name, locale)}
                </h3>
                <p className="mt-2 break-keep text-ink-soft">{pick(program.summary, locale)}</p>
                {program.details.length > 0 ? (
                  <ul className="mt-4 flex flex-col gap-2 text-sm break-keep text-ink">
                    {program.details.map((detail) => (
                      <li key={detail.en} className="border-l border-ocean/50 pl-3">
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

      <section aria-labelledby="crew-title" className="bg-paper">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading id="crew-title" title={t('crew.title')} body={t('crew.pending')} />
          {advisor ? (
            <DataPage className="mt-10 max-w-2xl">
              <DataField label={FIELD.role}>{t('crew.advisor')}</DataField>
              <DataField label={FIELD.person}>{pick(advisor.name, locale)}</DataField>
              <DataField label={FIELD.org} wide>
                {pick(advisor.org, locale)}
              </DataField>
            </DataPage>
          ) : null}
          <ul className="mt-8 flex flex-wrap gap-3">
            {officers.map((officer) => (
              <li
                key={officer.id}
                className="rounded-full border border-cobalt/25 bg-white px-4 py-2 font-semibold text-cobalt"
              >
                {pick(officer.role, locale)}
                {officer.consent && officer.name ? ` · ${pick(officer.name, locale)}` : null}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="history-title" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading id="history-title" title={t('history.title')} />
          <StampTrail className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {stamps.map((stamp) => (
              <Stamp
                key={stamp.id}
                stamp={stamp}
                state={stampState(stamp, today)}
                locale={locale}
                labels={labels}
              />
            ))}
          </StampTrail>
        </div>
      </section>
    </main>
  );
}
