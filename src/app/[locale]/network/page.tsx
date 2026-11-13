/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import { Bullet } from '@/components/site/bullet';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CtaBand } from '@/components/site/cta-band';
import { PageCover } from '@/components/site/page-cover';
import type { Mentor, Partner } from '@/content/schema';
import { asLocale } from '@/i18n/as-locale';
import type { Locale } from '@/i18n/locales';
import { getMentors, getPartners, getPress, getStats, pick, shownLogo } from '@/lib/content';
import { formatStampDate } from '@/lib/format';
import { localizedAlternates } from '@/lib/metadata';

type Props = { params: Promise<{ locale: string }> };

const KINDS: Partner['kind'][] = ['supporter', 'university', 'company'];
const MOU_ITEMS = ['crew', 'vcc', 'contest'] as const;
const SECTION = 'section-y scroll-mt-[88px] border-t border-white/10 text-white';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Meta.network' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: localizedAlternates(locale, '/network'),
  };
}

// Mentors, partners and agreements (wireframe v1.1, §13).
export default async function NetworkPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('Network');
  const [mentors, partners, stats, press] = await Promise.all([
    getMentors(),
    getPartners(),
    getStats(),
    getPress(),
  ]);
  const total = stats.find((s) => s.id === 'mentors')?.value ?? String(mentors.length);
  const mouPress = press.find((p) => p.id === 'smart-economy-mou');
  const jump = [
    { href: '#mentors', label: t('mentors.title') },
    { href: '#partners', label: t('partners.title') },
    { href: '#mou', label: t('mou.section') },
  ];

  return (
    <main id="main" className="bg-stage">
      <PageCover title={t('title')} lead={t('lead', { mentors: total, partners: partners.length })}>
        <ul className="mt-8 flex flex-wrap gap-2">
          {jump.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="inline-flex h-11 items-center rounded-full border border-white/25 px-4 text-[15px] font-semibold text-white/80 transition-colors duration-150 hover:text-white"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </PageCover>

      <section id="mentors" aria-labelledby="mentors-title" className={SECTION}>
        <div className="shell">
          <h2 id="mentors-title" className="font-display text-headline">
            {t('mentors.title')}
          </h2>
          <p className="mt-4 text-lg break-keep text-white/80">
            {t('mentors.note', { listed: mentors.length, total })}
          </p>
          <ul className="section-gap grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {mentors.map((mentor) => (
              <li key={mentor.id}>
                <MentorCard mentor={mentor} locale={locale} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="partners" aria-labelledby="partners-title" className={SECTION}>
        <div className="shell">
          <h2 id="partners-title" className="font-display text-headline">
            {t('partners.title')}
          </h2>
          <p className="mt-4 text-lg text-white/80">
            {t('partners.count', { count: partners.length })}
          </p>
          {KINDS.map((kind) => {
            const group = partners.filter((p) => p.kind === kind);
            return group.length > 0 ? (
              <div key={kind} className="section-gap">
                <h3 className="font-display text-subhead">{t(`partners.kind.${kind}`)}</h3>
                <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                  {group.map((partner) => (
                    <li key={partner.id}>
                      <PartnerTile partner={partner} locale={locale} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null;
          })}
        </div>
      </section>

      <section id="mou" aria-labelledby="mou-title" className={SECTION}>
        <div className="shell">
          <h2 className="font-display text-headline">{t('mou.section')}</h2>
          <article className="section-gap max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <h3 id="mou-title" className="font-display text-subhead break-keep">
              {t('mou.title')}
            </h3>
            <p className="mt-1 text-sm text-white/64">{t('mou.date')}</p>
            <ul className="mt-5 grid gap-2 text-base break-keep text-white/80">
              {MOU_ITEMS.map((key) => (
                <li key={key} className="flex gap-2.5">
                  <Bullet />
                  {t(`mou.${key}`)}
                </li>
              ))}
            </ul>
            {mouPress ? (
              <p className="mt-5 text-sm text-white/64">
                {t('mou.press')} · {pick(mouPress.outlet, locale)} ·{' '}
                {formatStampDate(mouPress.date, locale)}
                {/* The article's own title, in the language it was written in. */}
                <span lang="ko" className="mt-1 block text-white/80">
                  {mouPress.title}
                </span>
              </p>
            ) : null}
          </article>
        </div>
      </section>

      <CtaBand title={t('cta')} partnerOnly />
    </main>
  );
}

// A mentor (wireframe v1.1, §5.7): photo or initial, name, where they work, one line, up to three
// fields. Only mentors who agreed to be named are in the list.
function MentorCard({ mentor, locale }: { mentor: Mentor; locale: Locale }) {
  const name = pick(mentor.name, locale);
  return (
    <article data-mentor className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      {mentor.photo ? (
        <Image
          src={mentor.photo}
          alt=""
          width={64}
          height={64}
          className="size-16 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="flex size-16 items-center justify-center rounded-full bg-white/15 font-display text-xl font-semibold"
        >
          {Array.from(name)[0]}
        </span>
      )}
      <h3 className="mt-4 font-display text-subhead break-keep">{name}</h3>
      <p className="mt-1 font-semibold break-keep text-white/80">{pick(mentor.org, locale)}</p>
      <p className="mt-1 text-sm break-keep text-white/64">{pick(mentor.role, locale)}</p>
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {mentor.expertise.slice(0, 3).map((field) => (
          <li
            key={field.en}
            className="rounded-full border border-white/20 px-2.5 py-0.5 text-[13px] text-white/80"
          >
            {pick(field, locale)}
          </li>
        ))}
      </ul>
    </article>
  );
}

// A partner: its logo when one is approved, otherwise its name, and the country for a university.
function PartnerTile({ partner, locale }: { partner: Partner; locale: Locale }) {
  const name = pick(partner.name, locale);
  const logo = shownLogo(partner);
  const body = (
    <>
      {logo ? (
        // Logos are made for white paper, many in dark ink, so each sits on a light card.
        // The name stays written under it: some marks are a parent company's, and names are searchable.
        <>
          <span className="flex h-16 w-full items-center justify-center rounded-lg bg-white px-4">
            <img src={logo} alt="" className="max-h-10 w-auto max-w-full object-contain" />
          </span>
          <span className="mt-3 text-sm font-semibold break-keep">{name}</span>
        </>
      ) : (
        <span className="font-semibold break-keep">{name}</span>
      )}
      {partner.kind === 'university' && partner.country ? (
        <span className="mt-1 text-sm text-white/64">{pick(partner.country, locale)}</span>
      ) : null}
    </>
  );
  const tile =
    'flex h-full min-h-24 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center';
  return partner.url ? (
    <a href={partner.url} target="_blank" rel="noreferrer" className={tile}>
      {body}
    </a>
  ) : (
    <div className={tile}>{body}</div>
  );
}
