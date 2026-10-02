import { getTranslations } from 'next-intl/server';
import { ArrowRightIcon } from '@/components/icons';
import { DataField, DataPage } from '@/components/passport/data-page';
import { FIELD } from '@/components/passport/labels';
import { PartnerMark } from '@/components/passport/partner-mark';
import { SectionHeading } from '@/components/site/section-heading';
import type { Mentor, Partner } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { Link } from '@/i18n/navigation';
import { pick } from '@/lib/content';

type Props = { locale: Locale; mentorCount: string; mentors: Mentor[]; partners: Partner[] };

export async function NetworkPreview({ locale, mentorCount, mentors, partners }: Props) {
  const t = await getTranslations('Home.network');
  const featured = mentors.filter((m) => m.featured);

  return (
    <section aria-labelledby="network-title" className="bg-paper">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
        <SectionHeading
          id="network-title"
          title={t('title', { count: mentorCount })}
          body={t('body')}
        />
        <ul className="mt-12 grid gap-5 md:grid-cols-2">
          {featured.map((mentor) => (
            <li key={mentor.id}>
              <DataPage>
                <DataField label={FIELD.person}>{pick(mentor.name, locale)}</DataField>
                <DataField label={FIELD.org}>{pick(mentor.org, locale)}</DataField>
                <DataField label={FIELD.role} wide>
                  {pick(mentor.role, locale)}
                </DataField>
              </DataPage>
            </li>
          ))}
        </ul>
        <h3 className="mt-14 text-lg font-semibold text-cobalt">{t('partners')}</h3>
        <ul className="mt-4 flex flex-wrap gap-3">
          {partners.map((partner) => (
            <li
              key={partner.id}
              className="rounded-full border border-cobalt/25 bg-white px-4 py-2"
            >
              <PartnerMark partner={partner} locale={locale} />
            </li>
          ))}
        </ul>
        <Link
          href="/network"
          className="mt-10 inline-flex items-center gap-2 font-semibold text-cobalt underline underline-offset-4"
        >
          {t('cta')}
          <ArrowRightIcon />
        </Link>
      </div>
    </section>
  );
}
