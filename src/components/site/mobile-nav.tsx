'use client';

import { useEffect, useRef } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { LocaleSwitch } from './locale-switch';

type Item = { href: string; label: string };

export function MobileNav({
  items,
  joinLabel,
  menuLabel,
}: {
  items: Item[];
  joinLabel: string;
  menuLabel: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    ref.current?.removeAttribute('open');
  }, [pathname]);

  return (
    <details ref={ref} className="relative md:hidden">
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
        <div className="mt-2 flex items-center justify-between border-t border-paper-edge px-3 pt-3">
          <LocaleSwitch tone="ink" />
          <Link href="/join" className="rounded bg-cobalt px-4 py-2 font-semibold text-white">
            {joinLabel}
          </Link>
        </div>
      </nav>
    </details>
  );
}
