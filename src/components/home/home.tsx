import { getTranslations } from 'next-intl/server';
import type { Mentor, Partner, Photo, Recruitment, Stamp, Stat } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { isAuthEnabled } from '@/lib/auth/config';
import { pick } from '@/lib/content';
import { eventOf, recentEvents, upcomingEvents } from '@/lib/events';
import { Contact } from './contact';
import { Hero } from './hero';
import { Numbers } from './numbers';
import { Recent } from './recent';
import { Recruit } from './recruit';
import { Stages, type StagePhoto } from './stages';

type Props = {
  locale: Locale;
  stats: Stat[];
  stamps: Stamp[];
  photos: Photo[];
  mentors: Mentor[];
  partners: Partner[];
  recruitment: Recruitment;
  today: Date;
};

// The home answers a first-time visitor in the order they ask (wireframe v1.1, §8): what this is,
// whether to trust it, what it does, what came of it, and how to join in. The startup teams
// section (S4) waits for the teams' own pages to be public.
export async function Home({
  locale,
  stats,
  stamps,
  photos,
  mentors,
  partners,
  recruitment,
  today,
}: Props) {
  const t = await getTranslations('Home');
  const nav = await getTranslations('Nav');
  const value = (id: string) => stats.find((s) => s.id === id);
  const photo = (id: string) => photos.find((p) => p.id === id);
  const shot = (id: string): StagePhoto | undefined => {
    const p = photo(id);
    return p ? { photo: p, event: eventOf(p, stamps) } : undefined;
  };

  // The opening: the crew holding up its own jersey at BEYOND Expo.
  const opening = photo('beyond-expo-crew-jersey-2026');
  const teams = value('teams')?.value ?? '';
  const open = recruitment.status === 'open';
  const applyLabel = open ? nav('apply') : nav('applyInfoLong');
  const members = value('members');

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
        locale={locale}
        numbers={[
          { id: 'members', kind: 'people', value: members?.value ?? '' },
          { id: 'teams', kind: 'teams', value: teams },
          { id: 'mentors', kind: 'people', value: value('mentors')?.value ?? '' },
          { id: 'partners', kind: 'places', value: String(partners.length) },
        ].map((n) => ({
          id: n.id,
          label: t(`numbers.${n.id}`),
          // The unit is smaller than the number, next to it.
          shown: t.rich(`numbers.unit.${n.kind}`, {
            value: n.value,
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
        photos={{ domestic: shot('workshop-2026-01'), global: shot('techfest-vietnam') }}
        mentors={mentors}
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
    </>
  );
}
