import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DataField, DataPage } from '@/components/passport/data-page';
import { FIELD } from '@/components/passport/labels';
import { PartnerMark } from '@/components/passport/partner-mark';
import { PageCover } from '@/components/site/page-cover';
import { SectionHeading } from '@/components/site/section-heading';
import type { Partner } from '@/content/schema';
import { asLocale } from '@/i18n/as-locale';
import { getMentors, getPartners, getStats, pick } from '@/lib/content';
import { localizedAlternates } from '@/lib/metadata';

type Props = { params: Promise<{ locale: string }> };

const KINDS: Partner['kind'][] = ['supporter', 'company', 'university', 'program'];
const MOU_ITEMS = ['crew', 'vcc', 'contest'] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Meta.network' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: localizedAlternates(locale, '/network'),
  };
}

export default async function NetworkPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('Network');
  const [mentors, partners, stats] = await Promise.all([getMentors(), getPartners(), getStats()]);
  const total = stats.find((s) => s.id === 'mentors')?.value ?? String(mentors.length);

  return (
    <main id="main">
      <PageCover title={t('title', { count: total })} lead={t('lead')} />

      <section aria-labelledby="mentors-title" className="bg-paper">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading
            id="mentors-title"
            title={t('mentors.title')}
            body={t('mentors.note', { listed: mentors.length, total })}
          />
          <ul className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {mentors.map((mentor) => (
              <li key={mentor.id} data-mentor>
                <DataPage className="h-full">
                  <DataField label={FIELD.person}>{pick(mentor.name, locale)}</DataField>
                  <DataField label={FIELD.org}>{pick(mentor.org, locale)}</DataField>
                  <DataField label={FIELD.role} wide>
                    {pick(mentor.role, locale)}
                  </DataField>
                  <DataField label={FIELD.expertise} wide>
                    <span className="text-base font-normal text-ink">
                      {mentor.expertise.map((e) => pick(e, locale)).join(' · ')}
                    </span>
                  </DataField>
                </DataPage>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="partners-title" className="border-t border-paper-edge bg-paper">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading id="partners-title" title={t('partners.title')} />
          <dl className="mt-12 grid gap-10 md:grid-cols-2">
            {KINDS.map((kind) => (
              <div key={kind}>
                <dt className="text-lg font-semibold text-cobalt">{t(`partners.kind.${kind}`)}</dt>
                <dd className="mt-3">
                  <ul className="flex flex-wrap gap-3">
                    {partners
                      .filter((p) => p.kind === kind)
                      .map((partner) => (
                        <li
                          key={partner.id}
                          className="rounded-full border border-cobalt/25 bg-paper px-4 py-2"
                        >
                          <PartnerMark partner={partner} locale={locale} />
                        </li>
                      ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="mou-title" className="bg-paper">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-2">
          <SectionHeading id="mou-title" title={t('mou.title')} body={t('mou.date')} />
          <ul className="flex flex-col divide-y divide-paper-edge border-y border-paper-edge">
            {MOU_ITEMS.map((key) => (
              <li key={key} className="py-5 text-lg font-semibold break-keep text-cobalt">
                {t(`mou.${key}`)}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
