'use client';

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import { easeOutExpo, parseStatValue } from '@/lib/stage';
import { cn } from '@/lib/utils';

const DURATION = 1.4;

// Renders the final value on the server. On the client the number rolls up from 0 when it
// enters the view (every counter shares the same duration, so they land together) and its
// weight thickens with scroll. Reduced motion shows the final value at full weight.
export function CountUp({ value, className }: { value: string; className?: string }) {
  // Memoised so the animation effect does not restart on unrelated re-renders.
  const parsed = useMemo(() => parseStatValue(value), [value]);
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const count = useMotionValue(parsed?.number ?? 0);
  const text = useTransform(count, (v) => `${Math.round(v)}${parsed?.suffix ?? ''}`);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const weight = useTransform(scrollYProgress, [0, 1], [400, 950]);

  useEffect(() => {
    if (!parsed || reduce) return;
    if (!inView) {
      count.set(0);
      return;
    }
    const controls = animate(count, parsed.number, { duration: DURATION, ease: easeOutExpo });
    return () => controls.stop();
  }, [count, inView, parsed, reduce]);

  return (
    <motion.span
      ref={ref}
      data-count
      className={cn('block tabular-nums', className)}
      style={reduce || !parsed ? { fontWeight: 900 } : { fontWeight: weight }}
    >
      <motion.span aria-hidden>{parsed ? text : value}</motion.span>
      <span className="sr-only">{value}</span>
    </motion.span>
  );
}
