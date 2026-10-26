'use client';

import { motion, useScroll, useTransform } from 'motion/react';
import { useRef, type ReactNode } from 'react';
import { useMotionAllowed } from './use-motion-allowed';

// The opening: the photo fills the screen and, while the page holds still, pulls back and
// dims as the reader starts to scroll. Without JavaScript or with reduced motion it is a still
// full-screen photo.
export function HeroStage({
  photo,
  badge,
  children,
}: {
  photo: ReactNode;
  /** Kept out of the scaling layer so it stays clear of the site header. */
  badge?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const animate = useMotionAllowed();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.18, 1]);
  const dim = useTransform(scrollYProgress, [0, 1], [0, 0.55]);
  const lift = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <div ref={ref} data-hero className="relative h-[170svh]">
      <div className="sticky top-0 h-svh overflow-hidden">
        <motion.div className="absolute inset-0" style={animate ? { scale } : undefined}>
          {photo}
        </motion.div>
        <motion.div
          aria-hidden
          className="absolute inset-0 bg-stage"
          style={animate ? { opacity: dim } : { opacity: 0 }}
        />
        {badge}
        <motion.div className="absolute inset-0" style={animate ? { y: lift } : undefined}>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
