'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// The three stages as tabs that stay under the header on the program page (wireframe v1.1, §10 P2).
// They are plain links to the stage blocks; while the page scrolls, the stage on screen is marked.
export function StageTabs({
  stages,
  label,
}: {
  stages: { id: string; label: string }[];
  label: string;
}) {
  const [current, setCurrent] = useState(stages[0]?.id);

  useEffect(() => {
    const blocks = stages
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting);
        if (seen.length > 0) setCurrent(seen[0].target.id);
      },
      // The band just under the header and the tabs decides which stage is current.
      { rootMargin: '-140px 0px -60% 0px' },
    );
    blocks.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [stages]);

  return (
    <nav
      aria-label={label}
      className="sticky top-14 z-40 border-y border-white/10 bg-stage/92 backdrop-blur-md md:top-[72px]"
    >
      <ul className="shell flex [scrollbar-width:none] gap-2 overflow-x-auto py-2.5 md:py-3">
        {stages.map((stage, index) => (
          <li key={stage.id} className="shrink-0">
            <a
              href={`#${stage.id}`}
              aria-current={current === stage.id ? 'true' : undefined}
              className={cn(
                'inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors duration-150 md:h-11 md:gap-2 md:px-4 md:text-[15px]',
                current === stage.id
                  ? 'bg-lime text-cobalt'
                  : 'border border-white/20 text-white/80 hover:text-white',
              )}
            >
              <span className="tabular-nums">{String(index + 1).padStart(2, '0')}</span>
              {stage.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
