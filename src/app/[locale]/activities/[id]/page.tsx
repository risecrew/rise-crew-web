import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Gallery } from '@/components/board/gallery';
import { ArrowRightIcon } from '@/components/icons';
import { asLocale } from '@/i18n/as-locale';
import type { Locale } from '@/i18n/locales';
import { Link } from '@/i18n/navigation';
import { isAuthEnabled } from '@/lib/auth/config';
import { getActivities, getActivity, type Activity } from '@/lib/board/queries';
import { activityPhotoSrc, activityTimeline, localized, showsFallback } from '@/lib/board/text';
import { stampState } from '@/lib/content';
import { formatDateRange } from '@/lib/format';
import { localizedAlternates } from '@/lib/metadata';

type Props = { params: Promise<{ locale: string; id: string }> };

// Always the current row, as on the list.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isAuthEnabled()) return {};
  const { locale: raw, id } = await params;
  const locale = asLocale(raw);
  const activity = await getActivity(id);
  if (!activity) return {};
  const t = await getTranslations({ locale, namespace: 'Board.activities' });
  const title = localized(activity.title_ko, activity.title_en, locale);
  const summary = localized(activity.summary_ko, activity.summary_en, locale);
  return {
    title: t('metaDetail', { title }),
    description: summary || undefined,
    alternates: localizedAlternates(locale, `/activities/${activity.id}`),
  };
}

function when(activity: Activity, locale: Locale): string | null {
  return activity.date
    ? formatDateRange(activity.date, activity.end_date ?? undefined, locale)
    : null;
}

// One activity (wireframe v1.1, §12 E1–E8): its name, where and when, the photo with its caption,
// the summary, what happened, what came of it, and the activities either side of it.
export default async function ActivityPage({ params }: Props) {
  if (!isAuthEnabled()) notFound();
  const { locale: raw, id } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);
  const [activity, all] = await Promise.all([getActivity(id), getActivities()]);
  if (!activity) notFound();
  const t = await getTranslations('Board.activities');
  const common = await getTranslations('Common');

  const lang = (en: string) => (showsFallback(en, locale) ? 'ko' : undefined);
  const title = localized(activity.title_ko, activity.title_en, locale);
  const city = localized(activity.city_ko, activity.city_en, locale);
  const summary = localized(activity.summary_ko, activity.summary_en, locale);
  const body = localized(activity.body_ko, activity.body_en, locale);
  const resultsText = localized(activity.results_ko, activity.results_en, locale);
  const results = resultsText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const date = when(activity, locale);
  const caption = [title, city, date].filter(Boolean).join(' · ');
  const state = stampState(activityTimeline([activity])[0], new Date());

  // The list runs newest first; "previous" is the one before it in time.
  const index = all.findIndex((a) => a.id === activity.id);
  const newer = index > 0 ? all[index - 1] : undefined;
  const older = index >= 0 && index < all.length - 1 ? all[index + 1] : undefined;

  return (
    <main id="main" className="bg-stage text-white">
      <article className="shell max-w-[calc(760px+48px)] pt-[128px] pb-[72px] md:pt-[160px] md:pb-24">
        <p>
          <Link
            href="/activities"
            className="inline-flex min-h-11 items-center text-[15px] font-semibold text-white/80 underline-offset-4 hover:underline"
          >
            {t('toList')}
          </Link>
        </p>
        <h1
          lang={lang(activity.title_en)}
          className="mt-4 font-display text-display text-balance break-keep"
        >
          {title}
        </h1>
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-white/80">
          <span lang={lang(activity.city_en)}>{city}</span>
          <span aria-hidden>·</span>
          <time dateTime={activity.date ?? undefined} className="font-mono text-[15px]">
            {date ?? common('dateTbc')}
          </time>
          {state === 'done' ? null : (
            <span className="rounded-full border border-white/30 px-2.5 py-0.5 text-[13px] font-semibold">
              {state === 'upcoming' ? common('upcoming') : common('unconfirmed')}
            </span>
          )}
        </p>

        {activity.photo ? (
          <figure className="mt-10">
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-white/5">
              <Image
                src={activityPhotoSrc(activity.photo)}
                alt={localized(activity.photo_alt_ko, activity.photo_alt_en, locale) || title}
                fill
                priority
                unoptimized={!activity.photo.startsWith('/')}
                sizes="(min-width: 808px) 760px, 100vw"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-2 text-sm break-keep text-white/64">{caption}</figcaption>
          </figure>
        ) : null}

        {summary ? (
          <p
            lang={lang(activity.summary_en)}
            className="mt-10 text-lg leading-relaxed break-keep whitespace-pre-line text-white/80"
          >
            {summary}
          </p>
        ) : null}
        {body ? (
          <div
            lang={lang(activity.body_en)}
            className="mt-8 text-base leading-[1.7] break-keep whitespace-pre-line text-white/80"
          >
            {body}
          </div>
        ) : null}
        {results.length > 0 ? (
          <section aria-labelledby="results-title" className="mt-12">
            <h2 id="results-title" className="font-display text-headline">
              {t('results')}
            </h2>
            <ul lang={lang(activity.results_en)} className="mt-5 grid gap-2">
              {results.map((line) => (
                <li
                  key={line}
                  className="border-l-2 border-lime pl-4 text-base font-semibold break-keep"
                >
                  {line}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {activity.gallery.length > 0 ? (
          <section aria-labelledby="gallery-title" className="mt-12">
            <h2 id="gallery-title" className="font-display text-headline">
              {t('gallery')}
            </h2>
            <div className="mt-5">
              <Gallery
                photos={activity.gallery.map((path, i) => ({
                  src: activityPhotoSrc(path),
                  alt: t('galleryAlt', { title, number: i + 1 }),
                  external: true,
                }))}
                caption={caption}
                labels={{
                  open: t('galleryOpen'),
                  close: t('galleryClose'),
                  previous: t('galleryPrevious'),
                  next: t('galleryNext'),
                  viewer: t('galleryViewer', { title }),
                }}
              />
            </div>
          </section>
        ) : null}

        {older || newer ? (
          <nav
            aria-label={t('around')}
            className="mt-16 grid gap-4 border-t border-white/15 pt-8 sm:grid-cols-2"
          >
            {older ? <Neighbour activity={older} locale={locale} label={t('older')} /> : <span />}
            {newer ? <Neighbour activity={newer} locale={locale} label={t('newer')} end /> : null}
          </nav>
        ) : null}
      </article>
    </main>
  );
}

function Neighbour({
  activity,
  locale,
  label,
  end = false,
}: {
  activity: Activity;
  locale: Locale;
  label: string;
  end?: boolean;
}) {
  const title = localized(activity.title_ko, activity.title_en, locale);
  return (
    <Link
      href={`/activities/${activity.id}`}
      className={`group flex min-h-11 flex-col gap-1 ${end ? 'sm:items-end sm:text-right' : ''}`}
    >
      <span className="inline-flex items-center gap-1.5 text-sm text-white/64">
        {label}
        {end ? <ArrowRightIcon /> : null}
      </span>
      <span
        lang={showsFallback(activity.title_en, locale) ? 'ko' : undefined}
        className="font-semibold break-keep underline-offset-4 group-hover:underline"
      >
        {title}
      </span>
    </Link>
  );
}
