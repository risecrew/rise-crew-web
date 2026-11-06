'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { LocaleSwitch } from './locale-switch';

type Item = { href: string; label: string };

export function MobileNav({
  items,
  menuLabel,
  account,
  className,
}: {
  items: Item[];
  menuLabel: string;
  // The sign-in link or the signed-in rows, when accounts are switched on.
  account?: ReactNode;
  // From which width the full menu takes over.
  className: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    ref.current?.removeAttribute('open');
  }, [pathname]);

  return (
    <details ref={ref} className={cn('relative', className)}>
      <summary className="cursor-pointer list-none rounded border border-white/50 px-3 py-2 text-xs font-semibold tracking-[0.2em] text-white uppercase [&::-webkit-details-marker]:hidden">
        {menuLabel}
      </summary>
      <nav
        aria-label={menuLabel}
        className="absolute right-0 mt-3 w-64 rounded-lg bg-paper p-3 text-ink shadow-xl"
      >
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="block rounded px-3 py-3 hover:bg-paper-edge">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        {account}
        <div className="mt-2 border-t border-paper-edge px-3 pt-3">
          <LocaleSwitch tone="ink" />
        </div>
      </nav>
    </details>
  );
}
