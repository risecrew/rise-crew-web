'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef, type ReactNode } from 'react';

// The opening: the photo fills the screen and, while the page holds still, pulls back and
// dims as the reader starts to scroll. Without JavaScript it is a full-screen photo.
export function HeroStage({ photo, children }: { photo: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.18, 1]);
  const dim = useTransform(scrollYProgress, [0, 1], [0, 0.55]);
  const lift = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <div ref={ref} data-hero className="relative h-[170svh]">
      <div className="sticky top-0 h-svh overflow-hidden">
        <motion.div className="absolute inset-0" style={reduce ? undefined : { scale }}>
          {photo}
        </motion.div>
        <motion.div
          aria-hidden
          className="absolute inset-0 bg-stage"
          style={{ opacity: reduce ? 0 : dim }}
        />
        <motion.div className="absolute inset-0" style={reduce ? undefined : { y: lift }}>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
