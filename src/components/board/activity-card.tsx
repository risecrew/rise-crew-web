import Image from 'next/image';
import { RiseSymbol } from '@/components/brand/rise-symbol';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/locales';
import { stampState } from '@/lib/content';
import type { Activity } from '@/lib/board/queries';
import { activityPhotoSrc, activityTimeline, localized, showsFallback } from '@/lib/board/text';
import { Link } from '@/i18n/navigation';
import { formatDateRange } from '@/lib/format';

type Props = { activity: Activity; locale: Locale; today: Date };

// One thing the club did, as the list shows it. The whole card leads to its own page.
export async function ActivityCard({ activity, locale, today }: Props) {
  const t = await getTranslations('Common');
  const state = stampState(activityTimeline([activity])[0], today);
  const title = localized(activity.title_ko, activity.title_en, locale);
  const summary = localized(activity.summary_ko, activity.summary_en, locale);
  const lang = (en: string) => (showsFallback(en, locale) ? 'ko' : undefined);
  const alt = localized(activity.photo_alt_ko, activity.photo_alt_en, locale) || title;

  return (
    <article data-activity data-state={state} className="relative flex flex-col">
      {activity.photo ? (
        <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-white/5">
          <Image
            src={activityPhotoSrc(activity.photo)}
            alt={alt}
            fill
            unoptimized={!activity.photo.startsWith('/')}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : (
        // No photo: the club's mark holds its place, the same for every activity, so the row of cards
        // stays level.
        <div
          data-activity-mark
          className="flex aspect-[3/2] items-center justify-center overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 ring-inset"
        >
          {/* Sized inline: an SVG with no size of its own fills whatever it is in, so this must hold even
              if a stylesheet arrives late or stale. */}
          <div className="text-white" style={{ width: '20%', opacity: 0.35 }}>
            <RiseSymbol className="block" />
          </div>
        </div>
      )}
      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/65">
        <time dateTime={activity.date ?? undefined} className="tabular-nums">
          {activity.date
            ? formatDateRange(activity.date, activity.end_date ?? undefined, locale)
            : t('dateTbc')}
        </time>
        <span lang={lang(activity.city_en)} className="font-semibold text-white/85">
          {localized(activity.city_ko, activity.city_en, locale)}
        </span>
        {state === 'done' ? null : (
          <span className="rounded-full border border-white/25 px-2 py-0.5 text-xs font-semibold text-white/80">
            {state === 'upcoming' ? t('upcoming') : t('unconfirmed')}
          </span>
        )}
      </p>
      <h2
        lang={lang(activity.title_en)}
        className="mt-2 text-xl leading-snug font-bold text-balance break-keep text-white"
      >
        {/* The title is the link; it stretches over the whole card, so the photo and the text lead
            there too. */}
        <Link
          href={`/activities/${activity.id}`}
          className="underline-offset-4 after:absolute after:inset-0 hover:underline"
        >
          {title}
        </Link>
      </h2>
      {summary ? (
        <p
          lang={lang(activity.summary_en)}
          className="mt-2 text-base leading-relaxed break-keep whitespace-pre-line text-white/80"
        >
          {summary}
        </p>
      ) : null}
    </article>
  );
}
