import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageCover } from '@/components/site/page-cover';
import { SectionHeading } from '@/components/site/section-heading';
import { Fact, FactList } from '@/components/stage/facts';
import { PartnerMark } from '@/components/stage/partner-mark';
import type { Partner } from '@/content/schema';
import { asLocale } from '@/i18n/as-locale';
import { getMentors, getPartners, getPhoto, getStats, pick } from '@/lib/content';
import { localizedAlternates } from '@/lib/metadata';

type Props = { params: Promise<{ locale: string }> };

const KINDS: Partner['kind'][] = ['supporter', 'company', 'university', 'program'];
const MOU_ITEMS = ['crew', 'vcc', 'contest'] as const;
const SECTION = 'border-t border-white/10 bg-stage text-white';

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
  const common = await getTranslations('Common');
  const [mentors, partners, stats, photo] = await Promise.all([
    getMentors(),
    getPartners(),
    getStats(),
    getPhoto('workshop-2026-01'),
  ]);
  const total = stats.find((s) => s.id === 'mentors')?.value ?? String(mentors.length);

  return (
    <main id="main" className="bg-stage">
      <PageCover
        title={t('title', { count: total })}
        lead={t('lead')}
        photo={photo ? { photo, locale, temporaryLabel: common('temporaryPhoto') } : undefined}
      />

      <section aria-labelledby="mentors-title" className={SECTION}>
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading
            id="mentors-title"
            title={t('mentors.title')}
            body={t('mentors.note', { listed: mentors.length, total })}
          />
          <ul className="mt-12 grid gap-x-10 md:grid-cols-2 xl:grid-cols-3">
            {mentors.map((mentor) => (
              <li key={mentor.id} data-mentor className="border-t border-white/15 py-5">
                <p className="font-display text-2xl font-[850]">{pick(mentor.name, locale)}</p>
                <p className="mt-1 font-semibold break-keep text-white/90">
                  {pick(mentor.org, locale)}
                </p>
                <p className="mt-1 text-sm break-keep text-white/70">{pick(mentor.role, locale)}</p>
                <p className="mt-3 text-sm break-keep text-lime">
                  {mentor.expertise.map((e) => pick(e, locale)).join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="partners-title" className={SECTION}>
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
          <SectionHeading id="partners-title" title={t('partners.title')} />
          <dl className="mt-12 grid gap-10 md:grid-cols-2">
            {KINDS.map((kind) => (
              <div key={kind} className="border-t border-white/15 pt-4">
                <dt className="text-sm font-medium text-white/60">{t(`partners.kind.${kind}`)}</dt>
                <dd className="mt-3">
                  <ul className="flex flex-wrap gap-2">
                    {partners
                      .filter((p) => p.kind === kind)
                      .map((partner) => (
                        <li
                          key={partner.id}
                          className="rounded-full border border-white/20 px-4 py-2"
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

      <section aria-labelledby="mou-title" className={SECTION}>
        <div className="mx-auto grid max-w-7xl items-start gap-12 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-2">
          <SectionHeading id="mou-title" title={t('mou.title')} body={t('mou.date')} />
          <FactList>
            {MOU_ITEMS.map((key) => (
              <Fact key={key} label="MOU">
                {t(`mou.${key}`)}
              </Fact>
            ))}
          </FactList>
        </div>
      </section>
    </main>
  );
}
