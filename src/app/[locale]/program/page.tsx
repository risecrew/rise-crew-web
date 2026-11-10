import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { StageTabs } from '@/components/program/stage-tabs';
import { PRIMARY } from '@/components/site/buttons';
import { PageCover } from '@/components/site/page-cover';
import { getApplyButtonLabel } from '@/components/site/site-header';
import type { Stage } from '@/content/schema';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { getGrowthSteps, getPhotos, getPrograms, getStamps, pick } from '@/lib/content';
import { eventOf, recentEvents } from '@/lib/events';
import { formatCaption, formatDateRange } from '@/lib/format';
import { localizedAlternates } from '@/lib/metadata';

export const revalidate = 86400;

type Props = { params: Promise<{ locale: string }> };

const STAGES: Stage[] = ['campus', 'domestic', 'global'];
// Which of the five growth steps each stage covers.
const STEPS: Record<Stage, string[]> = {
  campus: ['idea', 'build'],
  domestic: ['validate', 'pitch'],
  global: ['global'],
};
// Each stage's photo.
const PHOTO: Partial<Record<Stage, string>> = {
  domestic: 'workshop-2026-01',
  global: 'techfest-vietnam',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Meta.program' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: localizedAlternates(locale, '/program'),
  };
}

// The program (wireframe v1.1, §10): three stages built the same way, each with what it runs and
// what it has done lately.
export default async function ProgramPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('Program');
  const home = await getTranslations('Home.stages');
  const [steps, programs, stamps, photos] = await Promise.all([
    getGrowthSteps(),
    getPrograms(),
    getStamps(),
    getPhotos(),
  ]);
  const recent = recentEvents(stamps, photos);
  const apply = await getApplyButtonLabel();

  return (
    <main id="main" className="bg-stage text-white">
      <PageCover eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />
      <StageTabs
        label={t('tabs')}
        stages={STAGES.map((stage) => ({ id: stage, label: home(`${stage}.label`) }))}
      />

      {STAGES.map((stage, index) => {
        const photo = PHOTO[stage] ? photos.find((p) => p.id === PHOTO[stage]) : undefined;
        const event = photo ? eventOf(photo, stamps) : undefined;
        const lately = recent.filter((r) => r.stamp.stage === stage).slice(0, 3);
        return (
          <section
            key={stage}
            id={stage}
            aria-labelledby={`${stage}-title`}
            className="scroll-mt-[136px] border-b border-white/10 section-y md:scroll-mt-[152px]"
          >
            <div className="shell grid gap-12 lg:grid-cols-[5fr_7fr]">
              <div>
                <p className="text-[13px] font-semibold text-lime">
                  <span className="font-mono">{String(index + 1).padStart(2, '0')}</span>{' '}
                  {home(`${stage}.label`)}
                </p>
                <h2
                  id={`${stage}-title`}
                  className="mt-2 font-display text-headline text-balance break-keep"
                >
                  {home(`${stage}.goal`)}
                </h2>
                <p className="mt-4 text-lg break-keep text-white/80">{t(`${stage}.body`)}</p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {steps
                    .filter((s) => STEPS[stage].includes(s.id))
                    .map((s) => (
                      <li
                        key={s.id}
                        lang="en"
                        className="rounded-full border border-white/20 px-3 py-1 text-[13px] font-semibold"
                      >
                        {pick(s.name, locale)}
                      </li>
                    ))}
                </ul>
                {photo ? (
                  <figure className="mt-8">
                    <div className="relative aspect-[3/2] overflow-hidden rounded-xl">
                      <Image
                        src={photo.src}
                        alt={pick(photo.alt, locale)}
                        fill
                        sizes="(min-width: 1024px) 480px, 100vw"
                        className="object-cover"
                      />
                    </div>
                    {event ? (
                      <figcaption className="mt-2 text-sm break-keep text-white/64">
                        {formatCaption(event, locale)}
                      </figcaption>
                    ) : null}
                  </figure>
                ) : null}
              </div>
              <ul className="grid content-start gap-8">
                {programs
                  .filter((p) => p.stage === stage)
                  .map((program) => (
                    <li key={program.id} className="border-t border-white/15 pt-5">
                      <h3 className="font-display text-subhead break-keep">
                        {pick(program.name, locale)}
                      </h3>
                      {program.meta ? (
                        <p className="mt-1 text-sm text-white/64">{pick(program.meta, locale)}</p>
                      ) : null}
                      <p className="mt-3 text-base break-keep text-white/80">
                        {pick(program.summary, locale)}
                      </p>
                      {program.details.length > 0 ? (
                        <ul className="mt-3 grid gap-1.5 text-base break-keep text-white/80">
                          {program.details.map((detail) => (
                            <li key={detail.en} className="border-l border-white/25 pl-3">
                              {pick(detail, locale)}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
              </ul>
            </div>
            {lately.length > 0 ? (
              <div className="shell mt-14">
                <h3 className="font-display text-subhead">{t('lately')}</h3>
                <ul className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {lately.map(({ stamp, photo: shot }) => (
                    <li key={stamp.id}>
                      <div className="relative aspect-[3/2] overflow-hidden rounded-xl">
                        <Image
                          src={shot.src}
                          alt={pick(shot.alt, locale)}
                          fill
                          sizes="(min-width: 1200px) 384px, (min-width: 768px) 50vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                      <p className="mt-3 line-clamp-2 font-semibold break-keep">
                        {pick(stamp.title, locale)}
                      </p>
                      <p className="mt-1 text-sm text-white/64">
                        {pick(stamp.city, locale)}
                        {stamp.date
                          ? ` · ${formatDateRange(stamp.date, stamp.endDate, locale)}`
                          : null}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        );
      })}

      <section aria-labelledby="program-cta" className="section-y">
        <div className="shell flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <h2 id="program-cta" className="font-display text-headline break-keep">
            {t('cta')}
          </h2>
          <Link href="/join" className={PRIMARY}>
            {apply}
          </Link>
        </div>
      </section>
    </main>
  );
}
