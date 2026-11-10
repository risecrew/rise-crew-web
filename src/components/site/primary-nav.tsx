'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export type NavItem = { href: string; label: string };

// Whether a menu item is the page the visitor is on, or a page under it.
export function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PrimaryNav({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      <ul className="flex items-center gap-8">
        {items.map((item) => {
          const current = isCurrent(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'relative inline-flex min-h-11 items-center text-base font-medium transition-colors duration-150 hover:text-white',
                  current
                    ? 'text-white after:absolute after:inset-x-0 after:bottom-1.5 after:h-0.5 after:bg-lime'
                    : 'text-white/72',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
