'use client';

import { useReducedMotion } from 'motion/react';
import { useSyncExternalStore } from 'react';

const noop = () => () => {};

// Scroll-linked motion runs only after hydration and only without reduced motion. The server
// render (and so the no-JS page) and a reduced-motion visitor both get the final, still state.
// Motion's own useReducedMotion is null on the server, so it cannot gate the server render.
export function useMotionAllowed(): boolean {
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const reduce = useReducedMotion();
  return hydrated && !reduce;
}
