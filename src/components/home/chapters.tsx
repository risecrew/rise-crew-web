import { getTranslations } from 'next-intl/server';
import { ArrowRightIcon } from '@/components/icons';
import { CountUp } from '@/components/stage/count-up';
import { PinnedGallery } from '@/components/stage/pinned-gallery';
import { StagePhoto } from '@/components/stage/stage-photo';
import type { Mentor, Partner, Photo, Press, Program, Stamp, Stat } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { Link } from '@/i18n/navigation';
import { pick } from '@/lib/content';
import { formatStampDate } from '@/lib/format';

// Room for the stage rail on wide screens.
const GUTTER = 'px-5 md:px-10 lg:pr-14 lg:pl-60 xl:pl-72';
const TITLE = 'font-display text-3xl font-[850] text-balance break-keep md:text-5xl';
const RULE = 'border-t border-white/20 pt-4';

type Stage = 'campus' | 'domestic' | 'global';

async function ChapterName({ stage }: { stage: Stage }) {
  const common = await getTranslations('Common');
  return (
    <h2
      id={`${stage}-title`}
      className="font-display text-[clamp(4.5rem,15vw,13rem)] leading-[0.82] font-[900] tracking-[-0.03em] text-white"
    >
      <span lang="en">{common(`stage.${stage}.name`)}</span>
      <span className="sr-only"> · {common(`stage.${stage}.sub`)}</span>
    </h2>
  );
}

function PressLine({ label, press, locale }: { label: string; press: Press; locale: Locale }) {
  return (
    <p className="mt-6 text-sm break-keep text-white/70">
      {label} · {pick(press.outlet, locale)} {formatStampDate(press.date, locale)} —{' '}
      <span lang="ko">{press.title}</span>
    </p>
  );
}

export async function RouteIntro() {
  const t = await getTranslations('Home');
  return (
    <div className={`${GUTTER} pt-28 md:pt-36`}>
      <h2 className={`${TITLE} max-w-3xl`}>{t('route.title')}</h2>
      <p className="mt-5 max-w-2xl text-lg break-keep text-white/75">{t('route.body')}</p>
    </div>
  );
}

export async function CampusChapter({
  locale,
  programs,
  vcc,
}: {
  locale: Locale;
  programs: Program[];
  vcc: Stat | undefined;
}) {
  const t = await getTranslations('Home');
  return (
    <section
      id="campus"
      data-chapter
      aria-labelledby="campus-title"
      className={`${GUTTER} py-24 text-white md:py-36`}
    >
      <ChapterName stage="campus" />
      <div className="mt-14 grid gap-14 md:grid-cols-[1fr_1.2fr]">
        <div>
          <h3 className={TITLE}>{t('backing.anchor')}</h3>
          <p className="mt-5 max-w-md text-lg break-keep text-white/75">{t('campus.body')}</p>
        </div>
        <div className="grid gap-10">
          {vcc ? (
            <div className={RULE}>
              <CountUp
                value={vcc.value}
                className="font-display text-[clamp(4rem,9vw,8rem)] leading-[0.85] text-lime"
              />
              <p className="mt-3 text-lg font-semibold">{pick(vcc.label, locale)}</p>
            </div>
          ) : null}
          <ul className="grid gap-6 sm:grid-cols-2">
            {programs
              .filter((p) => p.stage === 'campus')
              .map((p) => (
                <li key={p.id} className={RULE}>
                  <h4 className="font-display text-xl font-[800] break-keep">
                    {pick(p.name, locale)}
                  </h4>
                  <p className="mt-2 text-sm break-keep text-white/75">{pick(p.summary, locale)}</p>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export async function DomesticChapter({
  locale,
  photo,
  event,
  press,
  mentors,
  mentorCount,
  partners,
}: {
  locale: Locale;
  photo: Photo | undefined;
  event: Stamp | undefined;
  press: Press | undefined;
  mentors: Mentor[];
  mentorCount: string;
  partners: Partner[];
}) {
  const t = await getTranslations('Home');
  const common = await getTranslations('Common');
  return (
    <section id="domestic" data-chapter aria-labelledby="domestic-title" className="text-white">
      <div className="relative flex h-[85svh] items-end overflow-hidden">
        {photo ? (
          <StagePhoto photo={photo} locale={locale} temporaryLabel={common('temporaryPhoto')} />
        ) : null}
        <div className={`relative ${GUTTER} pb-14`}>
          <ChapterName stage="domestic" />
          {event?.date ? (
            <p className="mt-4 text-sm font-semibold break-keep text-white/85">
              {pick(event.title, locale)} · {pick(event.city, locale)} ·{' '}
              <span className="font-mono">{formatStampDate(event.date, locale)}</span>
            </p>
          ) : null}
        </div>
      </div>
      <div className={`${GUTTER} grid gap-16 py-24 md:grid-cols-2 md:py-32`}>
        <div>
          <h3 className={TITLE}>{t('backing.title')}</h3>
          <dl className="mt-10 grid gap-8">
            <div className={RULE}>
              <dt className="text-white/75">{t('backing.mou')}</dt>
              <dd className="mt-1 font-display text-3xl font-[850] break-keep">
                {t('backing.mouDate')}
              </dd>
            </div>
            <div className={RULE}>
              <dt className="text-white/75">{t('backing.seed')}</dt>
              <dd className="mt-1 font-display text-3xl font-[850] break-keep">
                {t('backing.seedValue')}
              </dd>
            </div>
          </dl>
          {press ? <PressLine label={t('backing.reported')} press={press} locale={locale} /> : null}
        </div>
        <div>
          <h3 className={TITLE}>{t('network.title', { count: mentorCount })}</h3>
          <p className="mt-5 text-lg break-keep text-white/75">{t('network.body')}</p>
          <ul className="mt-8 grid gap-5">
            {mentors.map((m) => (
              <li key={m.id} className={RULE}>
                <p className="font-display text-2xl font-[800]">{pick(m.name, locale)}</p>
                <p className="text-sm break-keep text-white/75">
                  {pick(m.org, locale)} · {pick(m.role, locale)}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm break-keep text-white/75">
            <span className="font-semibold text-white">{t('network.partners')}</span>{' '}
            {partners.map((p) => pick(p.name, locale)).join(' · ')}
          </p>
          <Link
            href="/network"
            className="mt-8 inline-flex items-center gap-2 font-semibold text-lime underline underline-offset-4"
          >
            {t('network.cta')}
            <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}

export async function GlobalChapter({
  locale,
  stops,
  contest,
  press,
}: {
  locale: Locale;
  stops: { stamp: Stamp; photo: Photo }[];
  contest: Stat[];
  press: Press | undefined;
}) {
  const t = await getTranslations('Home');
  const common = await getTranslations('Common');
  return (
    <section
      id="global"
      data-chapter
      aria-labelledby="global-title"
      className="pt-24 text-white md:pt-36"
    >
      <div className={GUTTER}>
        <ChapterName stage="global" />
        <h3 className={`${TITLE} mt-10`}>{t('global.title')}</h3>
      </div>
      <div className={GUTTER}>
        <PinnedGallery
          items={stops.map(({ stamp, photo }) => ({
            id: stamp.id,
            label: pick(stamp.city, locale),
            photo: (
              <StagePhoto photo={photo} locale={locale} temporaryLabel={common('temporaryPhoto')} />
            ),
            caption: (
              <>
                <p className="text-sm font-semibold text-lime">
                  {t('global.tag')} · {pick(stamp.city, locale)} ·{' '}
                  <span className="font-mono">
                    {stamp.date ? formatStampDate(stamp.date, locale) : common('dateTbc')}
                  </span>
                </p>
                <h4 className="mt-2 font-display text-3xl font-[850] text-balance break-keep md:text-5xl">
                  {pick(stamp.title, locale)}
                </h4>
              </>
            ),
          }))}
        />
      </div>
      <div className={`${GUTTER} grid gap-12 py-24 md:grid-cols-[1.2fr_1fr] md:py-32`}>
        <div>
          <h3 className={TITLE}>{t('contest.title')}</h3>
          <p className="mt-5 text-lg break-keep text-white/75">{t('contest.body')}</p>
          {press ? <PressLine label={t('contest.reported')} press={press} locale={locale} /> : null}
        </div>
        <dl className="grid grid-cols-2 gap-6">
          {contest.map((s) => (
            <div key={s.id} className="flex flex-col">
              <dt className="order-2 mt-2 text-white/80">{pick(s.label, locale)}</dt>
              <dd className="order-1">
                <CountUp
                  value={s.value}
                  className="font-display text-[clamp(4.5rem,9vw,8rem)] leading-[0.85] text-lime"
                />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
