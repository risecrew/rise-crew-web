import type { CSSProperties } from 'react';
import type { Stamp as StampData } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { pick, type StampState } from '@/lib/content';
import { formatStampDate, stampRotation } from '@/lib/passport';
import { cn } from '@/lib/utils';
import type { StampLabels } from './stamp-labels';

const BORDER = {
  campus: 'border-cobalt',
  domestic: 'border-ocean',
  global: 'border-leaf',
} as const;

type Props = { stamp: StampData; state: StampState; locale: Locale; labels: StampLabels };

export function Stamp({ stamp, state, locale, labels }: Props) {
  const source = stamp.evidence.find((e) => e.url);
  const date = stamp.date ? formatStampDate(stamp.date, locale) : labels.dateTbc;
  const content = (
    <>
      <span className="font-mono text-[10px] tracking-[0.2em] uppercase">
        {stamp.country} · {date}
      </span>
      <span className="font-display text-xl leading-none font-[800] break-keep uppercase">
        {pick(stamp.city, locale)}
      </span>
      <span className="text-sm leading-snug break-keep">{pick(stamp.title, locale)}</span>
      {state === 'done' ? null : (
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase">
          {state === 'upcoming' ? labels.upcoming : labels.unconfirmed}
        </span>
      )}
    </>
  );

  return (
    <article
      data-stamp
      data-state={state}
      style={{ '--stamp-rot': `${stampRotation(stamp.id)}deg` } as CSSProperties}
      className={cn(
        'stamp flex min-h-40 flex-col justify-center gap-2 rounded-2xl border-[3px] bg-white/70 p-5 text-center',
        state === 'done'
          ? cn(BORDER[stamp.stage], 'text-cobalt')
          : 'border-ink-soft/60 text-ink-soft border-dashed',
      )}
    >
      {source?.url ? (
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="focus-visible:outline-ocean flex flex-col gap-2 rounded focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          {content}
          <span className="sr-only">{labels.source}</span>
        </a>
      ) : (
        content
      )}
    </article>
  );
}
