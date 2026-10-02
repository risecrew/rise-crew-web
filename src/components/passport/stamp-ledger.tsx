import type { Stamp as StampData } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { pick, stampState } from '@/lib/content';
import { formatStampDate } from '@/lib/passport';
import { cn } from '@/lib/utils';
import type { StampLabels } from './stamp-labels';

type Props = {
  stamps: StampData[];
  locale: Locale;
  labels: StampLabels;
  today: Date;
  className?: string;
};

// The written record beside the stamps: full titles and sources live here, so the stamp
// faces can stay short like real ink impressions.
export function StampLedger({ stamps, locale, labels, today, className }: Props) {
  return (
    <ol className={cn('divide-y divide-paper-edge border-y border-paper-edge text-sm', className)}>
      {stamps.map((stamp) => {
        const state = stampState(stamp, today);
        const source = stamp.evidence.find((e) => e.url);
        return (
          <li key={stamp.id} className="grid grid-cols-[6.5rem_1fr] gap-3 py-2.5">
            <time dateTime={stamp.date} className="font-mono text-xs leading-5 text-ink-soft">
              {stamp.date ? formatStampDate(stamp.date, locale) : labels.dateTbc}
            </time>
            <span className="break-keep text-ink">
              {pick(stamp.title, locale)}
              {state === 'done' ? null : (
                <span className="text-ink-soft">
                  {' '}
                  · {state === 'upcoming' ? labels.upcoming : labels.unconfirmed}
                </span>
              )}
              {source?.url ? (
                <>
                  {' '}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cobalt underline underline-offset-4"
                  >
                    {labels.source}
                  </a>
                </>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
