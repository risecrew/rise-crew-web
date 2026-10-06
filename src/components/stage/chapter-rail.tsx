'use client';

import { motion, useScroll, useTransform } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type Chapter = { id: string; name: string; sub: string };

// The middle of the line counts as "here", for both the rail and the current chapter.
const MIDDLE = '-50% 0px -50% 0px';

// Wraps the three chapters and keeps a rail on screen that shows where the reader is:
// a vertical rail on the left on wide screens, a bar across the top on phones. The rail only
// exists while a chapter is on screen; while hidden it is out of the tab order too.
export function ChapterRail({
  label,
  chapters,
  children,
}: {
  label: string;
  chapters: Chapter[];
  children: ReactNode;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const { scrollYProgress } = useScroll({ target: wrap, offset: ['start center', 'end center'] });
  const fill = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useEffect(() => {
    const root = wrap.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === root) setShown(entry.isIntersecting);
          else if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: MIDDLE },
    );
    io.observe(root);
    for (const c of chapters) {
      const el = document.getElementById(c.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [chapters]);

  const visibility = shown ? 'visible opacity-100' : 'invisible opacity-0';

  return (
    <div ref={wrap} className="relative">
      <nav
        aria-label={label}
        className={cn(
          'fixed top-1/2 left-6 z-30 hidden -translate-y-1/2 transition-[opacity,visibility] duration-300 lg:flex xl:left-10',
          visibility,
        )}
      >
        <div aria-hidden className="relative mr-4 w-[2px] rounded-full bg-white/15">
          <motion.div
            className="absolute inset-0 origin-top rounded-full bg-[linear-gradient(180deg,var(--color-lime),var(--color-leaf),var(--color-teal),var(--color-ocean))]"
            style={{ scaleY: fill }}
          />
        </div>
        <ol className="flex flex-col gap-10 py-1">
          {chapters.map((c) => (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                aria-current={active === c.id ? 'step' : undefined}
                className={cn(
                  'block transition-colors duration-300',
                  active === c.id ? 'text-white' : 'text-white/55 hover:text-white/80',
                )}
              >
                <span lang="en" className="block font-display text-lg leading-none font-[850]">
                  {c.name}
                </span>
                <span className="mt-1 block text-xs">{c.sub}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <nav
        aria-label={label}
        className={cn(
          'fixed inset-x-0 top-0 z-30 bg-stage/85 px-4 pt-3 pb-2 backdrop-blur-md transition-[opacity,visibility] duration-300 lg:hidden',
          visibility,
        )}
      >
        <ol className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
          {chapters.map((c) => (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                lang="en"
                aria-current={active === c.id ? 'step' : undefined}
                className={cn(
                  'block py-1 transition-colors duration-300',
                  active === c.id ? 'text-white' : 'text-white/55',
                )}
              >
                {c.name}
              </a>
            </li>
          ))}
        </ol>
        <div aria-hidden className="mt-1 h-[2px] overflow-hidden rounded-full bg-white/15">
          <motion.div
            className="h-full origin-left bg-[linear-gradient(90deg,var(--color-lime),var(--color-leaf),var(--color-teal),var(--color-ocean))]"
            style={{ scaleX: fill }}
          />
        </div>
      </nav>

      {children}
    </div>
  );
}
