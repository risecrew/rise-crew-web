import { getTranslations } from 'next-intl/server';
import { Bullet } from '@/components/site/bullet';
import Image from 'next/image';
import { TextLink } from '@/components/site/text-link';
import type { Photo, Stage, Stamp } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { pick } from '@/lib/content';
import { formatCaption } from '@/lib/format';

const STAGES: Stage[] = ['campus', 'domestic', 'global'];

export type StagePhoto = { photo: Photo; event: Stamp | undefined };

// S3 (wireframe v1.1, §8): the three stages as three cards built the same way, then the mentors who
// stand behind all of them.
export async function Stages({
  locale,
  photos,
  mentorCount,
}: {
  locale: Locale;
  photos: Partial<Record<Stage, StagePhoto>>;
  mentorCount: string;
}) {
  const t = await getTranslations('Home.stages');
  const m = await getTranslations('Home.mentors');

  return (
    <section aria-labelledby="stages-title" className="section-y text-white">
      <div className="shell">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="max-w-3xl">
            <h2 id="stages-title" className="font-display text-headline text-balance break-keep">
              {t('title')}
            </h2>
            <p className="mt-4 text-lg break-keep text-white/80">{t('body')}</p>
          </div>
          <TextLink href="/program">{t('more')}</TextLink>
        </div>
        <ol className="section-gap grid gap-6 md:grid-cols-3">
          {STAGES.map((stage, index) => {
            const shot = photos[stage];
            return (
              <li
                key={stage}
                className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <p className="text-[13px] font-semibold text-lime">
                  <span className="tabular-nums">{String(index + 1).padStart(2, '0')}</span>{' '}
                  {t(`${stage}.label`)}
                </p>
                <h3 className="mt-2 font-display text-subhead break-keep">{t(`${stage}.goal`)}</h3>
                <figure className="mt-5">
                  <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-[radial-gradient(ellipse_80%_70%_at_50%_100%,rgb(0_62_145/0.6),transparent_75%)]">
                    {shot ? (
                      <Image
                        src={shot.photo.src}
                        alt={pick(shot.photo.alt, locale)}
                        fill
                        sizes="(min-width: 1200px) 384px, (min-width: 768px) 33vw, 100vw"
                        className="object-cover"
                      />
                    ) : (
                      // No photo of this stage yet: its name, large, instead of a placeholder.
                      <span
                        aria-hidden
                        lang="en"
                        className="absolute inset-0 flex items-center justify-center font-display text-headline text-white/80"
                      >
                        {t(`${stage}.word`)}
                      </span>
                    )}
                  </div>
                  {shot?.event ? (
                    <figcaption className="mt-2 text-sm break-keep text-white/64">
                      {formatCaption(shot.event, locale)}
                    </figcaption>
                  ) : null}
                </figure>
                <ul className="mt-5 grid gap-2 text-base break-keep text-white/80">
                  {[1, 2, 3].map((n) => (
                    <li key={n} className="flex gap-2.5">
                      <Bullet />
                      {t(`${stage}.item${n}`)}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-5">
                  <TextLink
                    href={{ pathname: '/program', hash: stage }}
                    aria-label={t('detailFor', { stage: t(`${stage}.label`) })}
                  >
                    {t('detail')}
                  </TextLink>
                </div>
              </li>
            );
          })}
        </ol>

        {/* The mentors behind every stage, in one line: who they are, and the way to all of them. */}
        <div className="relative isolate mt-10 overflow-hidden rounded-2xl border border-white/10 p-6 md:p-8">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_120%_at_0%_50%,rgb(0_62_145/0.7),transparent_70%),rgb(255_255_255/0.03)]"
          />
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-10">
            <div>
              <p className="font-display text-subhead break-keep">
                {m('title', { count: mentorCount })}
              </p>
              <p className="mt-2 text-base break-keep text-white/80">{m('body')}</p>
            </div>
            <div className="shrink-0">
              <TextLink href={{ pathname: '/network', hash: 'mentors' }}>{m('all')}</TextLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
