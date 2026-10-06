import { getTranslations } from 'next-intl/server';
import { ChapterRail } from '@/components/stage/chapter-rail';
import type { Mentor, Partner, Photo, Press, Program, Stamp, Stat } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { stampState, type ApplyCta } from '@/lib/content';
import { Ask } from './ask';
import { CampusChapter, DomesticChapter, GlobalChapter, RouteIntro } from './chapters';
import { Hero } from './hero';
import { Traction } from './traction';

const STAGES = ['campus', 'domestic', 'global'] as const;

type Props = {
  locale: Locale;
  stats: Stat[];
  stamps: Stamp[];
  photos: Photo[];
  programs: Program[];
  mentors: Mentor[];
  partners: Partner[];
  press: Press[];
  cta: ApplyCta;
  today: Date;
};

// The home follows RISE CREW's own three stages, Campus → Domestic → Global, with a rail that
// keeps the reader's place. The direction contract is in
// .impeccable/surfaces/src-app-locale-page-tsx.md.
export async function Home({
  locale,
  stats,
  stamps,
  photos,
  programs,
  mentors,
  partners,
  press,
  cta,
  today,
}: Props) {
  const t = await getTranslations('Home');
  const common = await getTranslations('Common');
  const stat = (id: string) => stats.find((s) => s.id === id);
  const photo = (id: string) => photos.find((p) => p.id === id);
  const pickStats = (ids: string[]) => ids.map(stat).filter((s): s is Stat => !!s);
  const workshop = photo('workshop-2026-01');

  // Global stops in the order they happened; undated ones last.
  const stops = stamps
    .filter((s) => s.stage === 'global' && s.photo && photo(s.photo))
    .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))
    .map((s) => ({ stamp: s, photo: photo(s.photo!)! }));

  const chapters = STAGES.map((id) => ({
    id,
    name: common(`stage.${id}.name`),
    sub: common(`stage.${id}.sub`),
  }));

  return (
    <>
      <Hero locale={locale} photo={workshop} cta={cta} />
      <Traction
        locale={locale}
        stats={pickStats(['members', 'teams', 'mentors'])}
        photo={workshop}
      />
      <ChapterRail label={t('rail.label')} chapters={chapters}>
        <RouteIntro />
        <CampusChapter locale={locale} programs={programs} vcc={stat('vcc-sessions')} />
        <DomesticChapter
          locale={locale}
          photo={workshop}
          event={stamps.find((s) => s.photo === 'workshop-2026-01')}
          press={press.find((p) => p.id === 'smart-economy-mou')}
          mentors={mentors.filter((m) => m.featured)}
          mentorCount={stat('mentors')?.value ?? ''}
          partners={partners}
        />
        <GlobalChapter
          locale={locale}
          stops={stops}
          contest={pickStats(['contest-countries', 'contest-teams'])}
          press={press.find((p) => p.id === 'eduplus-aix')}
        />
      </ChapterRail>
      <Ask
        locale={locale}
        cta={cta}
        upcoming={stamps.filter((s) => stampState(s, today) === 'upcoming')}
      />
    </>
  );
}
