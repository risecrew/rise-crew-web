import type { CSSProperties, ReactNode } from 'react';
import type { Stamp as StampData } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { pick, type StampState } from '@/lib/content';
import {
  formatStampDate,
  stampRotation,
  stampScale,
  stampShape,
  type StampShape,
} from '@/lib/passport';
import { cn } from '@/lib/utils';
import type { StampLabels } from './stamp-labels';

// Ink color of the frame per stage. Text stays cobalt so it keeps AA contrast on paper.
const FRAME = { campus: 'text-cobalt', domestic: 'text-ocean', global: 'text-leaf' } as const;
const BASE_WIDTH: Record<StampShape, number> = { circle: 148, oval: 196, rect: 184, hexagon: 172 };
const SCALE = { sm: 0.9, md: 1, lg: 1.12 } as const;
const RATIO: Record<StampShape, string> = {
  circle: '1 / 1',
  oval: '160 / 110',
  rect: '160 / 104',
  hexagon: '140 / 122',
};
const INSET: Record<StampShape, string> = {
  circle: '19% 15%',
  oval: '17% 14%',
  rect: '12% 9%',
  hexagon: '15% 17%',
};

function Frame({ shape, dashed }: { shape: StampShape; dashed: boolean }) {
  const outer = { strokeWidth: 2.5, strokeDasharray: dashed ? '5 4' : undefined };
  const inner = { strokeWidth: 1 };
  const svg = (viewBox: string, shapes: ReactNode) => (
    <svg
      aria-hidden
      viewBox={viewBox}
      className="absolute inset-0 h-full w-full fill-none stroke-current"
    >
      {shapes}
    </svg>
  );
  switch (shape) {
    case 'circle':
      return svg(
        '0 0 120 120',
        <>
          <circle cx="60" cy="60" r="57" {...outer} />
          {dashed ? null : <circle cx="60" cy="60" r="51" {...inner} />}
        </>,
      );
    case 'oval':
      return svg(
        '0 0 160 110',
        <>
          <ellipse cx="80" cy="55" rx="77" ry="52" {...outer} />
          {dashed ? null : <ellipse cx="80" cy="55" rx="71" ry="46" {...inner} />}
        </>,
      );
    case 'rect':
      return svg(
        '0 0 160 104',
        <>
          <rect x="2" y="2" width="156" height="100" rx="8" {...outer} />
          {dashed ? null : <rect x="8" y="8" width="144" height="88" rx="4" {...inner} />}
        </>,
      );
    case 'hexagon':
      return svg(
        '0 0 140 122',
        <>
          <polygon points="36,2 104,2 138,61 104,120 36,120 2,61" {...outer} />
          {dashed ? null : <polygon points="40,8 100,8 131,61 100,114 40,114 9,61" {...inner} />}
        </>,
      );
  }
}

type Props = { stamp: StampData; state: StampState; locale: Locale; labels: StampLabels };

export function Stamp({ stamp, state, locale, labels }: Props) {
  const shape = stampShape(stamp.id);
  const done = state === 'done';
  const date = stamp.date ? formatStampDate(stamp.date, locale) : labels.dateTbc;
  const status = state === 'upcoming' ? labels.upcoming : labels.unconfirmed;
  const rotation = stampRotation(stamp.id);
  const style = {
    '--stamp-rot': `${rotation}deg`,
    '--stamp-y': `${rotation * 2}px`,
    width: `${Math.round(BASE_WIDTH[shape] * SCALE[stampScale(stamp.id)])}px`,
    aspectRatio: RATIO[shape],
  } as CSSProperties;

  return (
    <article
      data-stamp
      data-state={state}
      data-shape={shape}
      style={style}
      className={cn(
        'stamp relative shrink-0',
        done ? cn('stamp-ink', FRAME[stamp.stage]) : 'text-ink-soft',
      )}
    >
      <Frame shape={shape} dashed={!done} />
      <div
        className="absolute flex flex-col items-center justify-center gap-1 text-center"
        style={{ inset: INSET[shape] }}
      >
        <span
          className={cn('font-mono text-[9px] tracking-[0.15em] uppercase', done && 'text-cobalt')}
        >
          {done ? `${stamp.country} · ${date}` : `${date} · ${status}`}
        </span>
        <span
          className={cn(
            'font-display text-[15px] leading-tight font-[800] break-keep uppercase',
            done && 'text-cobalt',
          )}
        >
          {pick(stamp.city, locale)}
        </span>
        <span className={cn('text-[11px] leading-tight break-keep', done && 'text-cobalt')}>
          {pick(stamp.label, locale)}
        </span>
      </div>
      <span className="sr-only">{pick(stamp.title, locale)}</span>
    </article>
  );
}
