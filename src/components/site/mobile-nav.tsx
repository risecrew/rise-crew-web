'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CloseIcon, MenuIcon } from '@/components/icons';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { LocaleSwitch } from './locale-switch';
import { isCurrent, type NavItem } from './primary-nav';

// The phone menu (wireframe v1.1, §6.9): a sheet over the whole screen. It is a modal dialog, so
// the page behind it cannot be reached with the keyboard or a screen reader while it is open, and
// Escape closes it. Opening a page from it closes it too. Focus goes back to the menu button.
export function MobileNav({
  items,
  labels,
  apply,
  account,
  className,
}: {
  items: NavItem[];
  labels: { open: string; close: string; menu: string };
  apply: ReactNode;
  account?: ReactNode;
  // From which width the full menu takes over.
  className: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const close = () => dialogRef.current?.close();

  // A new page closes the sheet.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  // The page behind does not scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = before;
    };
  }, [open]);

  return (
    <div className={cn('flex items-center', className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={labels.open}
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => {
          dialogRef.current?.showModal();
          setOpen(true);
        }}
        className="inline-flex size-11 items-center justify-center text-2xl text-white"
      >
        <MenuIcon />
      </button>
      <dialog
        ref={dialogRef}
        id="site-menu"
        aria-label={labels.menu}
        onClose={() => {
          setOpen(false);
          buttonRef.current?.focus();
        }}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-stage p-0 text-white backdrop:bg-stage"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 shrink-0 items-center justify-end px-2">
            <button
              type="button"
              aria-label={labels.close}
              onClick={close}
              className="inline-flex size-11 items-center justify-center text-2xl"
            >
              <CloseIcon />
            </button>
          </div>
          <nav aria-label={labels.menu} className="flex-1 overflow-y-auto px-5">
            <ul>
              {items.map((item) => {
                const current = isCurrent(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={current ? 'page' : undefined}
                      onClick={close}
                      className={cn(
                        'flex h-14 items-center border-l-2 pl-4 text-2xl font-semibold',
                        current ? 'border-lime text-white' : 'border-transparent text-white/80',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="grid shrink-0 gap-4 border-t border-white/10 px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {apply}
            <LocaleSwitch variant="sheet" />
            {account}
          </div>
        </div>
      </dialog>
    </div>
  );
}
