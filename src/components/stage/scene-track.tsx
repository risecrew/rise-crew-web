'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  id: string;
  index: number;
  photo?: boolean;
  /** The final scene does not hold; it hands straight over to the footer. */
  last?: boolean;
  label: string;
  children: ReactNode;
};

// Track geometry, in svh. A scene sticks while its track scrolls past. Each track overlaps the
// previous one by one viewport, so the next scene rises while the previous one is still stuck:
//   HOLD     the scene sits alone on stage
//   +100     the next scene rises over it (previous shrinks and dims)
//   +100     the overlap that keeps the previous scene stuck during that rise
const HOLD = 40;
const RISE = 100;
const TRACK = HOLD + RISE + 100;
const COVER_START = HOLD / TRACK;
const COVER_END = (HOLD + RISE) / TRACK;

// One pinned scene of the deck. Without JavaScript the sticky stacking still works; only the
// shrink and dim are missing.
export function SceneTrack({ id, index, photo, last, label, children }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: track, offset: ['start start', 'end start'] });
  const scale = useTransform(scrollYProgress, [COVER_START, COVER_END], [1, 0.9]);
  const dim = useTransform(scrollYProgress, [COVER_START, COVER_END], [0, 0.75]);

  return (
    <div
      ref={track}
      className={cn('relative', index > 0 && '-mt-[100svh]')}
      style={{ zIndex: index + 1, height: `${last ? HOLD + 100 : TRACK}svh` }}
    >
      <motion.section
        data-scene={id}
        data-photo={photo ? '' : undefined}
        aria-label={label}
        className="sticky top-0 flex h-svh origin-top flex-col items-center justify-center overflow-hidden bg-stage px-3 pt-20 pb-16 md:px-8"
        style={reduce ? undefined : { scale }}
      >
        {children}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-stage"
          style={{ opacity: reduce ? 0 : dim }}
        />
      </motion.section>
    </div>
  );
}
