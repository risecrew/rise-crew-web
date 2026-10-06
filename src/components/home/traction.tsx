import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { CountUp } from '@/components/stage/count-up';
import type { Photo, Stat } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { pick } from '@/lib/content';

// The numbers, on the people behind them.
export async function Traction({
  locale,
  stats,
  photo,
}: {
  locale: Locale;
  stats: Stat[];
  photo: Photo | undefined;
}) {
  const t = await getTranslations('Home');

  return (
    <section
      data-traction
      aria-labelledby="traction-title"
      className="relative overflow-hidden text-white"
    >
      {photo ? (
        <Image
          src={photo.src}
          alt=""
          fill
          sizes="100vw"
          className="scale-125 object-cover object-[50%_40%] opacity-60"
        />
      ) : null}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,var(--color-stage),rgb(0_62_145/0.82)_35%,rgb(0_62_145/0.9)_70%,var(--color-stage))]"
      />
      <div className="relative mx-auto max-w-7xl px-5 py-28 md:px-10 md:py-40">
        <h2 id="traction-title" className="font-display text-2xl font-[800] md:text-4xl">
          {t('traction.title')}
        </h2>
        <dl className="mt-10 grid gap-10 md:grid-cols-3">
          {stats.map((s) => (
            <div key={s.id} className="flex flex-col">
              <dt className="order-2 mt-3 text-lg font-semibold">
                {pick(s.label, locale)}
                <span className="block text-sm font-normal text-white/75">
                  {pick(s.basis, locale)}
                </span>
              </dt>
              <dd className="order-1">
                <CountUp
                  value={s.value}
                  className="font-display text-[clamp(5rem,13vw,11rem)] leading-[0.85]"
                />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
