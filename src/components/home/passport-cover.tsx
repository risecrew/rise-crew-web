import { getTranslations } from 'next-intl/server';
import { RiseSymbol } from '@/components/brand/rise-symbol';
import { BoardingPass } from '@/components/passport/boarding-pass';
import { DataField, DataPage } from '@/components/passport/data-page';
import { Guilloche } from '@/components/passport/guilloche';
import { FIELD, type FieldLabel } from '@/components/passport/labels';
import type { Stat } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { Link } from '@/i18n/navigation';
import { pick, type ApplyCta } from '@/lib/content';
import { toMrz } from '@/lib/passport';

const SLOGAN = [
  ['R', 'each your vision,'],
  ['I', 'gnite your idea,'],
  ['S', 'cale up your impact,'],
  ['E', 'levate your future.'],
] as const;

const STAT_LABEL: Record<string, FieldLabel> = {
  members: FIELD.members,
  teams: FIELD.teams,
  mentors: FIELD.mentors,
};

type Props = { locale: Locale; stats: Stat[]; cta: ApplyCta };

// The cover fills the first viewport; the data page sits on its lower edge and overlaps the
// next section, like an open passport whose data page slides out from under the cover.
export async function PassportCover({ locale, stats, cta }: Props) {
  const t = await getTranslations('Home.cover');
  const ctaT = await getTranslations('Cta');

  return (
    <section aria-labelledby="cover-title" className="relative isolate z-10 bg-cobalt text-white">
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <Guilloche palette="white" className="h-full w-full" />
      </div>
      <div className="mx-auto flex min-h-svh max-w-7xl flex-col items-center px-5 pt-24 text-center md:px-10 md:pt-28">
        <p className="text-[11px] font-semibold tracking-[0.35em] text-white/80 uppercase sm:text-xs">
          {t('issuer')}
        </p>
        <RiseSymbol className="emboss mt-6 h-16 w-auto text-white/90 md:h-20 lg:h-24" />
        <h1
          id="cover-title"
          lang="en"
          className="mt-6 font-display text-[clamp(2.1rem,6.4vw,5.25rem)] leading-[0.98] font-[850] tracking-[-0.02em]"
        >
          {SLOGAN.map(([initial, rest]) => (
            <span key={initial} className="block">
              <span className="text-lime">{initial}</span>
              {rest}
            </span>
          ))}
        </h1>
        <p className="mt-5 max-w-2xl text-base break-keep text-white/85 md:text-lg">
          {t('subline')}
        </p>

        <div className="mt-8 flex w-full flex-wrap items-center justify-center gap-x-8 gap-y-4 md:justify-end">
          <Link href="/contact" className="font-semibold text-white underline underline-offset-4">
            {ctaT('partner')}
          </Link>
          <BoardingPass cta={cta} />
        </div>

        <DataPage
          columns={3}
          className="relative mt-8 -mb-28 w-full text-left md:-mb-24"
          mrz={toMrz(['RISE CREW', 'SKKU', 'KOR', 'EST 2025'])}
        >
          {stats.map((stat) => (
            <DataField key={stat.id} label={STAT_LABEL[stat.id] ?? stat.label}>
              <span className="font-display text-3xl font-[850]">{stat.value}</span>
              <span className="mt-1 block text-xs font-normal text-ink-soft">
                {pick(stat.basis, locale)}
              </span>
            </DataField>
          ))}
        </DataPage>
      </div>
    </section>
  );
}
