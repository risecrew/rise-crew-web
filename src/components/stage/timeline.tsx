import { getTranslations } from 'next-intl/server';
import type { Stamp } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { pick, stampState } from '@/lib/content';
import { formatStampDate } from '@/lib/format';
import { cn } from '@/lib/utils';

type Props = { events: Stamp[]; locale: Locale; today: Date; className?: string };

// The run of show: every event with its date and place. Events that have not happened read
// as upcoming, and planned events whose date has passed read as unconfirmed.
export async function Timeline({ events, locale, today, className }: Props) {
  const t = await getTranslations('Common');
  return (
    <ol className={cn('border-b border-white/15', className)}>
      {events.map((event) => {
        const state = stampState(event, today);
        const source = event.evidence.find((e) => e.url);
        return (
          <li
            key={event.id}
            data-event
            data-state={state}
            className={cn(
              'grid gap-x-6 gap-y-1 border-t border-white/15 py-4 sm:grid-cols-[9rem_10rem_1fr]',
              state !== 'done' && 'text-white/60',
            )}
          >
            <time dateTime={event.date} className="font-mono text-sm text-white/60">
              {event.date ? formatStampDate(event.date, locale) : t('dateTbc')}
            </time>
            <span className="font-semibold break-keep">{pick(event.city, locale)}</span>
            <span className="break-keep">
              {pick(event.title, locale)}
              {state === 'done' ? null : (
                <span className="ml-2 inline-block rounded-full border border-white/25 px-2 py-0.5 text-xs font-semibold text-white/80">
                  {state === 'upcoming' ? t('upcoming') : t('unconfirmed')}
                </span>
              )}
              {source?.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 text-lime underline underline-offset-4"
                >
                  {t('source')}
                </a>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
