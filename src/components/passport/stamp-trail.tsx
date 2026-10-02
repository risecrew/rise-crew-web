'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// Stamps render visible on the server. On capable clients, only stamps below the fold are
// armed (hidden) and then inked once when they scroll into view. No JS or reduced motion: nothing hides.
export function StampTrail({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || !('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const pending = Array.from(root.querySelectorAll<HTMLElement>('[data-stamp]')).filter(
      (el) => el.getBoundingClientRect().top > window.innerHeight * 0.9,
    );
    for (const el of pending) el.dataset.armed = '';

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          delete el.dataset.armed;
          el.dataset.inked = '';
          observer.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -15% 0px' },
    );
    for (const el of pending) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
