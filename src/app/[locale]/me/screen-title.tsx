'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// The heading of My page, which is also the heading of its edit step: the two are the same page
// with a different address (`?edit=1`), so this heading stays in place while the content under it
// changes. When the screen changes, focus moves here. Without that, someone using the keyboard
// who activated "Edit" would be left on a link that is no longer on the page, and a screen reader
// would say nothing about the change. (The first screen of a visit takes no focus.)
export function ScreenTitle({
  screen,
  className,
  children,
}: {
  screen: 'view' | 'edit';
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const shown = useRef(screen);

  useEffect(() => {
    if (shown.current === screen) return;
    shown.current = screen;
    ref.current?.focus();
  }, [screen]);

  return (
    <h1 ref={ref} tabIndex={-1} className={cn(className, 'focus:outline-none')}>
      {children}
    </h1>
  );
}
