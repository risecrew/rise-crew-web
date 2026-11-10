import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { TextLink } from '@/components/site/text-link';
import type { Photo, Stamp } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { pick } from '@/lib/content';
import { formatDateRange } from '@/lib/format';
import { cn } from '@/lib/utils';

// S5 (wireframe v1.1, §8): the five latest finished activities with a photo, the newest one large,
// then what is coming up, without photos.
export async function Recent({
  locale,
  events,
  upcoming,
  archive,
}: {
  locale: Locale;
  events: { stamp: Stamp; photo: Photo }[];
  upcoming: Stamp[];
  // Whether the activities page is open; without it there is no "see all" link.
  archive: boolean;
}) {
  if (events.length === 0 && upcoming.length === 0) return null;
  const t = await getTranslations('Home.recent');
  const common = await getTranslations('Common');
  const [first, ...rest] = events.slice(0, 5);

  return (
    <section aria-labelledby="recent-title" className="section-y text-white">
      <div className="shell">
        <div className="flex items-end justify-between gap-6">
          <h2 id="recent-title" className="font-display text-headline break-keep">
            {t('title')}
          </h2>
          {archive ? <TextLink href="/activities">{t('all')}</TextLink> : null}
        </div>
        {first ? (
          <ul className="section-gap grid gap-6 lg:grid-cols-2">
            <li>
              <Card event={first} locale={locale} large />
            </li>
            {rest.length > 0 ? (
              <li>
                <ul className="grid gap-6 sm:grid-cols-2">
                  {rest.map((event, index) => (
                    // On a phone three cards are enough; the rest are a tap away.
                    <li key={event.stamp.id} className={cn(index >= 2 && 'max-sm:hidden')}>
                      <Card event={event} locale={locale} />
                    </li>
                  ))}
                </ul>
              </li>
            ) : null}
          </ul>
        ) : null}
        {upcoming.length > 0 ? (
          <div className="mt-12">
            <h3 className="font-display text-subhead">{t('upcoming')}</h3>
            <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
              {upcoming.slice(0, 3).map((stamp) => (
                <li
                  key={stamp.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 py-4 text-base"
                >
                  <span className="font-mono text-sm text-white/64">
                    {stamp.date
                      ? formatDateRange(stamp.date, stamp.endDate, locale)
                      : common('dateTbc')}
                  </span>
                  <span className="font-semibold break-keep">{pick(stamp.title, locale)}</span>
                  <span className="text-sm text-white/64">{pick(stamp.city, locale)}</span>
                  <span className="rounded-full border border-white/30 px-2.5 py-0.5 text-[13px] font-semibold">
                    {common('upcoming')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

// An activity card: the photo, then its name and "place · date" under it (wireframe v1.1, §5.7).
function Card({
  event: { stamp, photo },
  locale,
  large = false,
}: {
  event: { stamp: Stamp; photo: Photo };
  locale: Locale;
  large?: boolean;
}) {
  return (
    <article>
      <div
        className={cn(
          'relative overflow-hidden rounded-xl bg-white/5',
          large ? 'aspect-[16/10]' : 'aspect-[3/2]',
        )}
      >
        <Image
          src={photo.src}
          alt={pick(photo.alt, locale)}
          fill
          sizes={
            large
              ? '(min-width: 1024px) 600px, 100vw'
              : '(min-width: 1024px) 288px, (min-width: 640px) 50vw, 100vw'
          }
          className="object-cover"
        />
      </div>
      <h3
        className={cn(
          'mt-3 line-clamp-2 break-keep',
          large ? 'font-display text-subhead' : 'text-base font-semibold',
        )}
      >
        {pick(stamp.title, locale)}
      </h3>
      <p className="mt-1 text-sm text-white/64">
        {pick(stamp.city, locale)}
        {stamp.date ? ` · ${formatDateRange(stamp.date, stamp.endDate, locale)}` : null}
      </p>
    </article>
  );
}
