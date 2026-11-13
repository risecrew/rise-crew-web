import { getTranslations } from 'next-intl/server';
import type { Partner, Photo, Recruitment, Stamp, Stat } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { isAuthEnabled } from '@/lib/auth/config';
import { pick, shownLogo } from '@/lib/content';
import { eventOf, recentEvents, upcomingEvents } from '@/lib/events';
import { Contact } from './contact';
import { CountUp } from './count-up';
import { Hero } from './hero';
import { Numbers } from './numbers';
import { PartnerBand } from './partner-band';
import { Recent } from './recent';
import { Recruit } from './recruit';
import { Stages, type StagePhoto } from './stages';

type Props = {
  locale: Locale;
  stats: Stat[];
  stamps: Stamp[];
  photos: Photo[];
  partners: Partner[];
  recruitment: Recruitment;
  today: Date;
};

// The home answers a first-time visitor in the order they ask (wireframe v1.1, §8): what this is,
// whether to trust it, what it does, what came of it, and how to join in. The startup teams
// section (S4) waits for the teams' own pages to be public.
export async function Home({ locale, stats, stamps, photos, partners, recruitment, today }: Props) {
  const t = await getTranslations('Home');
  const nav = await getTranslations('Nav');
  const value = (id: string) => stats.find((s) => s.id === id);
  const photo = (id: string) => photos.find((p) => p.id === id);
  const shot = (id: string): StagePhoto | undefined => {
    const p = photo(id);
    return p ? { photo: p, event: eventOf(p, stamps) } : undefined;
  };

  // The opening: the crew and its mentors in their jackets at the second roundtable workshop.
  const opening = photo('roundtable-2026-08-group');
  const teams = value('teams')?.value ?? '';
  const open = recruitment.status === 'open';
  const applyLabel = open ? nav('apply') : nav('applyInfoLong');
  const members = value('members');
  // Only partners with an approved logo file go on the band at the foot of the page.
  const logos = partners.flatMap((p) => {
    const logo = shownLogo(p);
    return logo ? [{ id: p.id, name: pick(p.name, locale), logo }] : [];
  });

  return (
    <>
      <Hero
        locale={locale}
        photo={opening}
        event={opening ? eventOf(opening, stamps) : undefined}
        teams={teams}
        applyLabel={applyLabel}
      />
      <Numbers
        numbers={[
          { id: 'members', kind: 'people', value: members?.value ?? '' },
          { id: 'teams', kind: 'teams', value: teams },
          { id: 'mentors', kind: 'people', value: value('mentors')?.value ?? '' },
          { id: 'partners', kind: 'places', value: String(partners.length) },
        ].map((n) => ({
          id: n.id,
          label: t(`numbers.${n.id}`),
          // The unit is smaller than the number, next to it.
          // "90+" reads "90명+" in Korean: the plus follows the unit, so it is passed apart.
          shown: t.rich(`numbers.unit.${n.kind}`, {
            value: n.value.replace(/\+$/, ''),
            plus: n.value.endsWith('+') ? '+' : '',
            num: () => <CountUp value={n.value.replace(/\+$/, '')} />,
            unit: (chunks) => (
              <span className="ml-1 text-xl font-semibold text-lime">{chunks}</span>
            ),
          }),
        }))}
        asOf={members ? pick(members.basis, locale) : ''}
        partners={partners}
      />
      <Stages
        locale={locale}
        photos={{
          campus: shot('seminar-2025-11'),
          domestic: shot('workshop-2026-01'),
          global: shot('techfest-vietnam'),
        }}
        mentorCount={value('mentors')?.value ?? ''}
      />
      <Recent
        locale={locale}
        events={recentEvents(stamps, photos)}
        upcoming={upcomingEvents(stamps, today)}
        archive={isAuthEnabled()}
      />
      <Recruit locale={locale} recruitment={recruitment} applyLabel={applyLabel} />
      <Contact />
      {logos.length > 0 ? (
        <section aria-labelledby="partner-band-title" className="border-t border-white/10 py-12">
          <h2
            id="partner-band-title"
            className="shell mb-6 text-[13px] font-semibold text-white/64"
          >
            {t('partners.title')}
          </h2>
          <PartnerBand
            logos={logos}
            pauseLabel={t('partners.pause')}
            playLabel={t('partners.play')}
          />
        </section>
      ) : null}
    </>
  );
}
