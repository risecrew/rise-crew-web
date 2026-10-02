import { getTranslations } from 'next-intl/server';
import { Stamp } from '@/components/passport/stamp';
import { getStampLabels } from '@/components/passport/stamp-labels';
import { StampTrail } from '@/components/passport/stamp-trail';
import { SectionHeading } from '@/components/site/section-heading';
import type { Stamp as StampData } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { stampState } from '@/lib/content';

type Props = { locale: Locale; stamps: StampData[]; today: Date };

export async function GlobalSection({ locale, stamps, today }: Props) {
  const t = await getTranslations('Home.global');
  const labels = await getStampLabels();
  const global = stamps.filter((s) => s.stage === 'global');

  return (
    <section aria-labelledby="global-title" className="bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
        <SectionHeading id="global-title" title={t('title')} body={t('body')} />
        <StampTrail className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {global.map((stamp) => (
            <Stamp
              key={stamp.id}
              stamp={stamp}
              state={stampState(stamp, today)}
              locale={locale}
              labels={labels}
            />
          ))}
        </StampTrail>
      </div>
    </section>
  );
}
