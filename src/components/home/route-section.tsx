import { getTranslations } from 'next-intl/server';
import { ArrowDownIcon } from '@/components/icons';
import { Guilloche } from '@/components/passport/guilloche';
import { Stamp } from '@/components/passport/stamp';
import { getStampLabels } from '@/components/passport/stamp-labels';
import { StampTrail } from '@/components/passport/stamp-trail';
import { SectionHeading } from '@/components/site/section-heading';
import type { Program, Stamp as StampData } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { pick, stampState } from '@/lib/content';

const STAGES = ['campus', 'domestic', 'global'] as const;

type Props = { locale: Locale; stamps: StampData[]; programs: Program[]; today: Date };

export async function RouteSection({ locale, stamps, programs, today }: Props) {
  const t = await getTranslations('Home.route');
  const common = await getTranslations('Common');
  const labels = await getStampLabels();

  return (
    <section aria-labelledby="route-title" className="route relative isolate bg-paper">
      <div
        aria-hidden
        className="route-backdrop pointer-events-none sticky top-0 -z-10 -mb-[100svh] h-svh"
      >
        <Guilloche palette="blue" className="absolute inset-0" />
        <Guilloche palette="green" className="route-backdrop__global absolute inset-0" />
      </div>
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
        <SectionHeading id="route-title" title={t('title')} body={t('body')} />
        <ol className="mt-14 flex flex-col gap-16 md:gap-24">
          {STAGES.map((stage, index) => {
            const stagePrograms = programs.filter((p) => p.stage === stage);
            const stageStamps = stamps.filter((s) => s.stage === stage);
            return (
              <li
                key={stage}
                data-stage={stage}
                className="grid gap-8 rounded-xl lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
              >
                <div>
                  <p className="font-mono text-sm text-ocean">
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mt-2 font-display text-3xl font-[800] break-keep text-cobalt">
                    {common(`stage.${stage}`)}
                  </h3>
                  <ul className="mt-6 flex flex-col gap-4">
                    {stagePrograms.map((program) => (
                      <li key={program.id} className="border-l border-ocean/50 pl-4">
                        <p className="font-semibold break-keep text-ink">
                          {pick(program.name, locale)}
                        </p>
                        <p className="mt-1 break-keep text-ink-soft">
                          {pick(program.summary, locale)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
                {stage === 'global' ? (
                  <p className="self-center">
                    <a
                      href="#global-title"
                      className="inline-flex items-center gap-2 font-semibold text-cobalt underline underline-offset-4"
                    >
                      {t('globalNote')}
                      <ArrowDownIcon />
                    </a>
                  </p>
                ) : (
                  <StampTrail className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                    {stageStamps.map((stamp) => (
                      <Stamp
                        key={stamp.id}
                        stamp={stamp}
                        state={stampState(stamp, today)}
                        locale={locale}
                        labels={labels}
                      />
                    ))}
                  </StampTrail>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
