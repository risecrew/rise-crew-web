'use client';

import { animate, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

// Strong ease-out: fast start, long settle, so the numbers land rather than stop.
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const DURATION = 1.2;

// One home number ("90+", "25") that counts up from 0 the first time it scrolls into view.
// The server sends the final value, so without JavaScript, with reduced motion, or when the number
// is already on screen at load, it simply shows. Screen readers get the final value once, from the
// sr-only copy; the counting digits are hidden from them.
export function CountUp({ value }: { value: string }) {
  const match = /^(\d+)(.*)$/.exec(value);
  const target = match ? Number(match[1]) : null;
  const suffix = match ? match[2] : '';

  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [shown, setShown] = useState<number | null>(null);
  // Decided once, on mount: count only if the number starts below the fold.
  const [counts, setCounts] = useState(false);

  useEffect(() => {
    if (target === null || reduce || !ref.current) return;
    const top = ref.current.getBoundingClientRect().top;
    if (top > window.innerHeight) {
      setCounts(true);
      setShown(0);
    }
  }, [target, reduce]);

  useEffect(() => {
    if (!counts || !inView || target === null) return;
    const controls = animate(0, target, {
      duration: DURATION,
      ease: EASE_OUT,
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [counts, inView, target]);

  return (
    <span ref={ref} className="tabular-nums">
      {/* The final value holds the width, so the column does not shift while the digits run. */}
      <span aria-hidden className="inline-grid">
        <span className="invisible col-start-1 row-start-1">{value}</span>
        <span className="col-start-1 row-start-1">
          {shown === null ? value : `${shown}${suffix}`}
        </span>
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
