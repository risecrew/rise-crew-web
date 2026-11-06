import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/locales';
import { stampState } from '@/lib/content';
import type { Activity } from '@/lib/board/queries';
import { activityPhotoSrc, activityTimeline, localized, showsFallback } from '@/lib/board/text';
import { formatStampDate } from '@/lib/format';

type Props = { activity: Activity; locale: Locale; today: Date };

// One thing the club did: everything there is to say about it, so it has no page of its own.
export async function ActivityCard({ activity, locale, today }: Props) {
  const t = await getTranslations('Common');
  const state = stampState(activityTimeline([activity])[0], today);
  const title = localized(activity.title_ko, activity.title_en, locale);
  const summary = localized(activity.summary_ko, activity.summary_en, locale);
  const lang = (en: string) => (showsFallback(en, locale) ? 'ko' : undefined);
  const alt = localized(activity.photo_alt_ko, activity.photo_alt_en, locale) || title;

  return (
    <article data-activity data-state={state} className="flex flex-col">
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
      ) : null}
      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/65">
        <time dateTime={activity.date ?? undefined} className="font-mono">
          {activity.date ? formatStampDate(activity.date, locale) : t('dateTbc')}
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
        {title}
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
