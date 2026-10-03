import { getTranslations } from 'next-intl/server';
import { ArrowRightIcon } from '@/components/icons';
import { Approach } from '@/components/stage/approach';
import { AskButton } from '@/components/stage/ask-button';
import { CountUp } from '@/components/stage/count-up';
import { DeckProgress } from '@/components/stage/deck-progress';
import { SceneTrack } from '@/components/stage/scene-track';
import { Screen } from '@/components/stage/screen';
import { StagePhoto } from '@/components/stage/stage-photo';
import type { Mentor, Partner, Photo, Press, Program, Stamp, Stat } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { Link } from '@/i18n/navigation';
import { pick, stampState, type ApplyCta } from '@/lib/content';
import { formatStampDate } from '@/lib/format';

const SLOGAN = [
  ['R', 'each your vision,'],
  ['I', 'gnite your idea,'],
  ['S', 'cale up your impact,'],
  ['E', 'levate your future.'],
] as const;
const STAGES = ['campus', 'domestic', 'global'] as const;
const PAD = 'px-[clamp(18px,5cqw,72px)]';

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

export async function Deck({
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
  const ctaT = await getTranslations('Cta');

  const stat = (id: string) => stats.find((s) => s.id === id);
  const photo = (id: string) => photos.find((p) => p.id === id);
  const cover = photo('workshop-2026-01');
  const globalScenes = stamps.filter((s) => s.stage === 'global' && s.photo && photo(s.photo));
  const total = 7 + globalScenes.length;
  const tempLabel = t('deck.temporary');
  const mou = press.find((p) => p.id === 'smart-economy-mou');
  const contestPress = press.find((p) => p.id === 'eduplus-aix');
  const upcoming = stamps.filter((s) => stampState(s, today) === 'upcoming');
  const tractionStats = ['members', 'teams', 'mentors'].map(stat).filter((s): s is Stat => !!s);
  let n = 0;
  const next = () => ++n;

  return (
    <>
      <div data-deck>
        {/* 1. Cover */}
        <SceneTrack id="cover" index={0} photo label={t('deck.label')}>
          <Approach>
            <Screen
              index={next()}
              total={total}
              className="max-w-[min(100%,calc((100svh-13rem)*16/9))]"
            >
              {cover ? (
                <StagePhoto photo={cover} locale={locale} temporaryLabel={tempLabel} priority />
              ) : null}
              <div
                className={`absolute inset-0 z-[1] flex flex-col justify-end ${PAD} pb-[clamp(44px,8cqw,104px)]`}
              >
                <h1
                  id="cover-title"
                  lang="en"
                  className="font-display text-[clamp(2rem,7cqw,6.5rem)] leading-[0.95] font-[850] tracking-[-0.02em] text-white"
                >
                  {SLOGAN.map(([initial, rest]) => (
                    <span key={initial} className="block">
                      <span className="text-lime">{initial}</span>
                      {rest}
                    </span>
                  ))}
                </h1>
                <p className="mt-[clamp(10px,1.6cqw,20px)] max-w-[62cqw] text-[clamp(13px,1.6cqw,20px)] break-keep text-white/85">
                  {t('cover.subline')}
                </p>
              </div>
            </Screen>
          </Approach>
          <div className="mt-5 flex w-full max-w-[min(100%,calc((100svh-13rem)*16/9))] flex-wrap items-center justify-end gap-x-6 gap-y-3">
            <Link href="/contact" className="font-semibold text-white underline underline-offset-4">
              {ctaT('partner')}
            </Link>
            <AskButton cta={cta} />
          </div>
        </SceneTrack>

        {/* 2. Traction: real people behind the numbers */}
        <SceneTrack id="traction" index={1} photo label={t('traction.title')}>
          <Screen index={next()} total={total} tone="cobalt">
            {cover ? (
              <StagePhoto
                photo={cover}
                locale={locale}
                temporaryLabel={tempLabel}
                scrim="full"
                className="scale-125 object-[50%_45%]"
              />
            ) : null}
            <div
              className={`absolute inset-0 z-[1] flex flex-col justify-center gap-[clamp(14px,3cqw,40px)] ${PAD} pb-[clamp(36px,6cqw,80px)]`}
            >
              <h2 className="font-display text-[clamp(20px,2.8cqw,40px)] font-[800] break-keep text-white">
                {t('traction.title')}
              </h2>
              <dl className="grid grid-cols-1 gap-[clamp(10px,2cqw,28px)] md:grid-cols-3">
                {tractionStats.map((s) => (
                  <div key={s.id} className="flex flex-col">
                    <dt className="order-2 text-[clamp(13px,1.5cqw,20px)] font-semibold text-white/90">
                      {pick(s.label, locale)}
                      <span className="block text-[clamp(11px,1.1cqw,14px)] font-normal text-white/70">
                        {pick(s.basis, locale)}
                      </span>
                    </dt>
                    <dd className="order-1">
                      <CountUp
                        value={s.value}
                        className="font-display text-[clamp(3rem,12cqw,11.5rem)] leading-[0.9] text-white"
                      />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </Screen>
        </SceneTrack>

        {/* 3. Backing */}
        <SceneTrack id="backing" index={2} label={t('backing.title')}>
          <Screen index={next()} total={total} tone="cobalt">
            <div
              className={`absolute inset-0 grid content-center gap-[clamp(14px,3cqw,44px)] ${PAD} pb-[clamp(36px,6cqw,80px)] text-white md:grid-cols-[1.1fr_1fr]`}
            >
              <div>
                <h2 className="font-display text-[clamp(1.6rem,4.6cqw,4.25rem)] leading-[1.02] font-[850] break-keep">
                  {t('backing.title')}
                </h2>
                <p className="mt-[clamp(8px,1.4cqw,18px)] text-[clamp(13px,1.6cqw,20px)] break-keep text-white/85">
                  {t('backing.anchor')}
                </p>
              </div>
              <dl className="grid gap-[clamp(10px,1.8cqw,24px)]">
                <div className="border-t border-white/25 pt-[clamp(8px,1.2cqw,16px)]">
                  <dt className="text-[clamp(12px,1.3cqw,17px)] text-white/80">
                    {t('backing.mou')}
                  </dt>
                  <dd className="font-display text-[clamp(1.4rem,3.4cqw,3rem)] font-[850]">
                    {t('backing.mouDate')}
                  </dd>
                </div>
                {stat('vcc-sessions') ? (
                  <div className="border-t border-white/25 pt-[clamp(8px,1.2cqw,16px)]">
                    <dt className="text-[clamp(12px,1.3cqw,17px)] text-white/80">
                      {pick(stat('vcc-sessions')!.label, locale)}
                    </dt>
                    <dd>
                      <CountUp
                        value={stat('vcc-sessions')!.value}
                        className="font-display text-[clamp(2.2rem,6cqw,5.5rem)] leading-none"
                      />
                    </dd>
                  </div>
                ) : null}
                <div className="border-t border-white/25 pt-[clamp(8px,1.2cqw,16px)]">
                  <dt className="text-[clamp(12px,1.3cqw,17px)] text-white/80">
                    {t('backing.seed')}
                  </dt>
                  <dd className="font-display text-[clamp(1.4rem,3.4cqw,3rem)] font-[850]">
                    {t('backing.seedValue')}
                  </dd>
                </div>
              </dl>
              {mou ? (
                <p className="text-[clamp(11px,1.15cqw,15px)] break-keep text-white/75 md:col-span-2">
                  {t('backing.reported')} · {pick(mou.outlet, locale)}{' '}
                  {formatStampDate(mou.date, locale)} — <span lang="ko">{mou.title}</span>
                </p>
              ) : null}
            </div>
          </Screen>
        </SceneTrack>

        {/* 4. Route */}
        <SceneTrack id="route" index={3} label={t('route.title')}>
          <Screen index={next()} total={total}>
            <div
              className={`absolute inset-0 flex flex-col justify-center gap-[clamp(14px,3cqw,44px)] ${PAD} pb-[clamp(36px,6cqw,80px)] text-white`}
            >
              <div>
                <h2 className="font-display text-[clamp(1.6rem,4.4cqw,4rem)] leading-[1.02] font-[850] break-keep">
                  {t('route.title')}
                </h2>
                <p className="mt-[clamp(6px,1cqw,14px)] max-w-[70cqw] text-[clamp(13px,1.5cqw,19px)] break-keep text-white/80">
                  {t('route.body')}
                </p>
              </div>
              <ol className="grid gap-[clamp(10px,2cqw,28px)] md:grid-cols-3">
                {STAGES.map((stage, i) => (
                  <li key={stage} className="border-t border-white/25 pt-[clamp(8px,1.2cqw,16px)]">
                    <p className="flex items-center gap-2 font-mono text-[clamp(11px,1.2cqw,15px)] text-lime">
                      {String(i + 1).padStart(2, '0')}
                      {i < STAGES.length - 1 ? (
                        <ArrowRightIcon className="hidden md:inline-block" />
                      ) : null}
                    </p>
                    <h3 className="mt-1 font-display text-[clamp(1.1rem,2.4cqw,2.2rem)] font-[800] break-keep">
                      {common(`stage.${stage}`)}
                    </h3>
                    <ul className="mt-[clamp(4px,0.8cqw,10px)] text-[clamp(12px,1.25cqw,16px)] break-keep text-white/80">
                      {programs
                        .filter((p) => p.stage === stage)
                        .map((p) => (
                          <li key={p.id}>{pick(p.name, locale)}</li>
                        ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>
          </Screen>
        </SceneTrack>

        {/* 5–8. On the ground abroad */}
        {globalScenes.map((stamp, i) => {
          const p = photo(stamp.photo!)!;
          const date = stamp.date ? formatStampDate(stamp.date, locale) : common('dateTbc');
          return (
            <SceneTrack
              key={stamp.id}
              id={stamp.id}
              index={4 + i}
              photo
              label={pick(stamp.title, locale)}
            >
              <Screen index={next()} total={total}>
                <StagePhoto photo={p} locale={locale} temporaryLabel={tempLabel} />
                <div
                  className={`absolute inset-x-0 bottom-0 z-[1] ${PAD} pb-[clamp(44px,7cqw,96px)] text-white`}
                >
                  <p className="text-[clamp(11px,1.25cqw,16px)] font-semibold tracking-[0.14em] text-lime uppercase">
                    {t('global.tag')} · {pick(stamp.city, locale)} ·{' '}
                    <span className="font-mono">{date}</span>
                  </p>
                  <h2 className="mt-[clamp(6px,1cqw,14px)] max-w-[80cqw] font-display text-[clamp(1.5rem,4.4cqw,4.2rem)] leading-[1.02] font-[850] break-keep">
                    {pick(stamp.title, locale)}
                  </h2>
                </div>
              </Screen>
            </SceneTrack>
          );
        })}

        {/* 9. The competition we co-hosted */}
        <SceneTrack id="contest" index={4 + globalScenes.length} label={t('contest.title')}>
          <Screen index={next()} total={total}>
            <div
              className={`absolute inset-0 grid content-center gap-[clamp(14px,3cqw,40px)] ${PAD} pb-[clamp(36px,6cqw,80px)] text-white md:grid-cols-[1.2fr_1fr]`}
            >
              <div>
                <h2 className="font-display text-[clamp(1.5rem,4.2cqw,4rem)] leading-[1.02] font-[850] break-keep">
                  {t('contest.title')}
                </h2>
                <p className="mt-[clamp(8px,1.4cqw,18px)] text-[clamp(13px,1.5cqw,19px)] break-keep text-white/80">
                  {t('contest.body')}
                </p>
                {contestPress ? (
                  <p className="mt-[clamp(8px,1.4cqw,18px)] text-[clamp(11px,1.15cqw,15px)] break-keep text-white/70">
                    {t('contest.reported')} · {pick(contestPress.outlet, locale)}{' '}
                    {formatStampDate(contestPress.date, locale)} —{' '}
                    <span lang="ko">{contestPress.title}</span>
                  </p>
                ) : null}
              </div>
              <dl className="grid grid-cols-2 gap-[clamp(10px,2cqw,28px)]">
                {['contest-countries', 'contest-teams'].map((id) => {
                  const s = stat(id);
                  if (!s) return null;
                  return (
                    <div key={id} className="flex flex-col">
                      <dt className="order-2 text-[clamp(12px,1.4cqw,18px)] text-white/80">
                        {pick(s.label, locale)}
                      </dt>
                      <dd className="order-1">
                        <CountUp
                          value={s.value}
                          className="font-display text-[clamp(3rem,11cqw,10rem)] leading-[0.9] text-lime"
                        />
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </Screen>
        </SceneTrack>

        {/* 10. Network */}
        <SceneTrack
          id="network"
          index={5 + globalScenes.length}
          label={t('network.title', { count: stat('mentors')?.value ?? '' })}
        >
          <Screen index={next()} total={total} tone="cobalt">
            <div
              className={`absolute inset-0 flex flex-col justify-center gap-[clamp(12px,2.4cqw,32px)] ${PAD} pb-[clamp(36px,6cqw,80px)] text-white`}
            >
              <h2 className="font-display text-[clamp(1.6rem,4.6cqw,4.25rem)] leading-[1.02] font-[850] break-keep">
                {t('network.title', { count: stat('mentors')?.value ?? '' })}
              </h2>
              <p className="max-w-[72cqw] text-[clamp(13px,1.5cqw,19px)] break-keep text-white/85">
                {t('network.body')}
              </p>
              <ul className="grid gap-[clamp(8px,1.4cqw,18px)] md:grid-cols-2">
                {mentors
                  .filter((m) => m.featured)
                  .map((m) => (
                    <li key={m.id} className="border-t border-white/25 pt-[clamp(6px,1cqw,12px)]">
                      <p className="font-display text-[clamp(1.1rem,2.2cqw,2rem)] font-[800]">
                        {pick(m.name, locale)}
                      </p>
                      <p className="text-[clamp(12px,1.25cqw,16px)] break-keep text-white/80">
                        {pick(m.org, locale)} · {pick(m.role, locale)}
                      </p>
                    </li>
                  ))}
              </ul>
              <p className="text-[clamp(12px,1.25cqw,16px)] break-keep text-white/80">
                <span className="font-semibold text-white">{t('network.partners')}</span>{' '}
                {partners.map((p) => pick(p.name, locale)).join(' · ')}
              </p>
              <Link
                href="/network"
                className="inline-flex w-fit items-center gap-2 font-semibold text-lime underline underline-offset-4"
              >
                {t('network.cta')}
                <ArrowRightIcon />
              </Link>
            </div>
          </Screen>
        </SceneTrack>

        {/* 11. The Ask */}
        <SceneTrack id="ask" index={6 + globalScenes.length} last label={t('ask.title')}>
          <Screen index={next()} total={total}>
            <div
              className={`absolute inset-0 grid content-center gap-[clamp(14px,3cqw,44px)] ${PAD} pb-[clamp(36px,6cqw,80px)] text-white md:grid-cols-[1.3fr_1fr]`}
            >
              <div>
                <h2 className="font-display text-[clamp(2rem,6cqw,5.75rem)] leading-[0.98] font-[850] break-keep">
                  {t('ask.title')}
                </h2>
                <p className="mt-[clamp(8px,1.4cqw,18px)] text-[clamp(13px,1.6cqw,20px)] break-keep text-white/85">
                  {t('ask.body')}
                </p>
                <div className="mt-[clamp(14px,2.4cqw,32px)] flex flex-wrap items-center gap-x-6 gap-y-3">
                  <AskButton cta={cta} />
                  <Link
                    href="/contact"
                    className="font-semibold text-white underline underline-offset-4"
                  >
                    {ctaT('partner')}
                  </Link>
                </div>
              </div>
              {upcoming.length > 0 ? (
                <div>
                  <h3 className="text-[clamp(12px,1.3cqw,17px)] font-semibold text-white/80">
                    {t('ask.next')}
                  </h3>
                  <ol className="mt-2 divide-y divide-white/15 border-y border-white/15">
                    {upcoming.map((s) => (
                      <li
                        key={s.id}
                        className="flex gap-4 py-[clamp(6px,0.9cqw,12px)] text-[clamp(12px,1.3cqw,17px)]"
                      >
                        <span className="w-[8ch] shrink-0 font-mono text-white/70">
                          {s.date ? formatStampDate(s.date, locale) : ''}
                        </span>
                        <span className="break-keep">
                          {pick(s.city, locale)} · {pick(s.label, locale)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          </Screen>
        </SceneTrack>
      </div>
      <DeckProgress total={total} label={t('deck.progress')} />
    </>
  );
}
