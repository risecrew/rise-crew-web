import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CtaBand } from '@/components/site/cta-band';
import { PageCover } from '@/components/site/page-cover';
import { TextLink } from '@/components/site/text-link';
import { asLocale } from '@/i18n/as-locale';
import { isAuthEnabled } from '@/lib/auth/config';
import { getMentors, getOfficers, getPhoto, getStamps, pick } from '@/lib/content';
import { formatDateRange } from '@/lib/format';
import { localizedAlternates } from '@/lib/metadata';

export const revalidate = 86400;

type Props = { params: Promise<{ locale: string }> };

const SECTION = 'section-y border-t border-white/10 text-white';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Meta.about' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: localizedAlternates(locale, '/about'),
  };
}

// Who we are, and nothing else (wireframe v1.1, §9): the growth plan and the programs live on the
// program page, the full record on the activities page.
export default async function AboutPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('About');
  const [officers, mentors, stamps, photo] = await Promise.all([
    getOfficers(),
    getMentors(),
    getStamps(),
    getPhoto('smu-vibe-coding-2025-12'),
  ]);
  const advisor = mentors.find((m) => m.id === 'shin-dongwon');
  const rise = (['r', 'i', 's', 'e'] as const).map((key) => t(`rise.${key}`));
  // Students who agreed to be shown. With nobody yet, the section is left out.
  const crew = officers.filter((o) => o.consent && o.name);
  const milestones = stamps
    .filter((s) => s.milestone && s.status === 'done')
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
    .slice(0, 6);
  const facts = [
    { label: t('supporter.period'), value: '2025.06–2030.02' },
    { label: t('supporter.funding'), value: t('supporter.fundingValue') },
    { label: t('supporter.global'), value: t('supporter.globalValue') },
    ...(advisor
      ? [
          {
            label: t('supporter.advisor'),
            value: t('supporter.advisorValue', { name: pick(advisor.name, locale) }),
          },
        ]
      : []),
  ];

  return (
    <main id="main" className="bg-stage">
      <PageCover
        eyebrow={t('eyebrow')}
        title="RISE CREW"
        lead={t('lead')}
        photo={photo ? { photo, locale } : undefined}
      />

      <section aria-labelledby="rise-title" className={SECTION}>
        <div className="shell grid gap-12 lg:grid-cols-2">
          <div>
            <h2 id="rise-title" className="font-display text-headline text-balance break-keep">
              {t('rise.title')}
            </h2>
            <p className="mt-4 text-lg break-keep text-white/80">
              {/* "Born to Global" on its own line, what it means under it. */}
              {t('rise.born')
                .split(/(?<=:)\s+/)
                .map((part, index) => (
                  <span key={index} className="block">
                    {part}
                  </span>
                ))}
            </p>
          </div>
          <ol className="grid gap-x-8 sm:grid-cols-2">
            {rise.map((line) => (
              <li key={line} className="border-t border-white/15 py-5">
                <p className="font-display text-subhead break-keep">
                  <span className="text-lime">{line.slice(0, 1)}</span>
                  {line.slice(1)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="supporter-title" className={SECTION}>
        <div className="shell grid items-start gap-12 lg:grid-cols-2">
          <div>
            <h2 id="supporter-title" className="font-display text-headline text-balance break-keep">
              {t('supporter.title')}
            </h2>
            {/* TODO(운영진 확인): whether the RISE program sentence stays (wireframe v1.1, C3-b), and
                how the Seoul ANCHOR Center sits between the program and the division (§9 A3). */}
            <p className="mt-4 text-lg break-keep text-white/80">{t('supporter.body')}</p>
          </div>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            {facts.map((fact) => (
              <div key={fact.label} className="border-t border-white/15 py-5">
                <dt className="text-sm text-white/64">{fact.label}</dt>
                <dd className="mt-1 font-display text-subhead break-keep">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {crew.length > 0 ? (
        <section aria-labelledby="crew-title" className={SECTION}>
          <div className="shell">
            <h2 id="crew-title" className="font-display text-headline">
              {t('crew.title')}
            </h2>
            <ul className="section-gap grid grid-cols-3 gap-6 md:grid-cols-6">
              {crew.map((officer) => (
                <li key={officer.id} className="text-center">
                  <span
                    aria-hidden
                    className="mx-auto flex size-16 items-center justify-center rounded-full bg-white/15 font-semibold"
                  >
                    {Array.from(pick(officer.name!, locale))[0]}
                  </span>
                  <p className="mt-2 font-semibold">{pick(officer.name!, locale)}</p>
                  <p className="text-sm text-white/64">{pick(officer.role, locale)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {milestones.length > 0 ? (
        <section aria-labelledby="milestones-title" className={SECTION}>
          <div className="shell">
            <div className="flex items-end justify-between gap-6">
              <h2 id="milestones-title" className="font-display text-headline break-keep">
                {t('milestones.title')}
              </h2>
              {isAuthEnabled() ? (
                <TextLink href="/activities">{t('milestones.all')}</TextLink>
              ) : null}
            </div>
            <ol className="section-gap grid gap-0 border-l border-white/15 md:grid-cols-3 md:border-t md:border-l-0 lg:grid-cols-6">
              {milestones.map((stamp) => (
                <li
                  key={stamp.id}
                  className="relative py-4 pl-6 before:absolute before:top-6 before:-left-[5px] before:size-2.5 before:rounded-full before:bg-lime md:pt-6 md:pr-4 md:pl-0 md:before:-top-[5px] md:before:left-0"
                >
                  <p className="text-sm text-white/64 tabular-nums">
                    {stamp.date ? formatDateRange(stamp.date, stamp.endDate, locale) : null}
                  </p>
                  <p className="mt-1 font-semibold break-keep">{pick(stamp.title, locale)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      <CtaBand />
    </main>
  );
}
