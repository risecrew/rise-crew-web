'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import type { ReactNode } from 'react';

// First scene only: as the visitor starts scrolling, the screen comes toward them until it
// fills the stage.
export function Approach({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const scale = useTransform(scrollY, [0, 420], [0.88, 1]);
  return (
    <motion.div className="flex w-full justify-center" style={reduce ? undefined : { scale }}>
      {children}
    </motion.div>
  );
}
