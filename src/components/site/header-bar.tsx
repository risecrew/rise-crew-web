'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

// The header stays at the top of the window on every page (wireframe v1.1, §6). Over a page that
// opens on a photo it starts clear, with a shade from the top so the white menu reads, and turns to
// the stage colour once the page moves; on every other page it is solid from the start.
export function HeaderBar({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [clear, setClear] = useState(false);

  useEffect(() => {
    const photo = () => document.querySelector('[data-photo-hero]') !== null;
    const update = () => setClear(photo() && window.scrollY < 8);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [pathname]);

  return (
    <header
      data-site-header
      data-clear={clear || undefined}
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-200 ease-out',
        clear
          ? 'border-transparent bg-[linear-gradient(180deg,rgb(0_0_0/0.4),transparent)]'
          : 'border-white/10 bg-stage/92 backdrop-blur-md',
      )}
    >
      {children}
    </header>
  );
}
