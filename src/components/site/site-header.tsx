import { getTranslations } from 'next-intl/server';
import { RiseSymbol } from '@/components/brand/rise-symbol';
import { Link } from '@/i18n/navigation';
import { LocaleSwitch } from './locale-switch';
import { MobileNav } from './mobile-nav';

export const NAV_ITEMS = [
  { href: '/', key: 'home' },
  { href: '/about', key: 'about' },
  { href: '/network', key: 'network' },
  { href: '/contact', key: 'contact' },
] as const;

export async function SiteHeader() {
  const t = await getTranslations('Nav');
  const items = NAV_ITEMS.map((item) => ({ href: item.href, label: t(item.key) }));

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <a
        href="#main"
        className="focus:text-cobalt sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:rounded focus:bg-white focus:px-3 focus:py-2"
      >
        {t('skip')}
      </a>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-5 md:px-10">
        <Link href="/" className="flex items-center gap-2 text-white">
          <RiseSymbol className="h-8 w-auto" />
          <span className="font-display text-lg font-[800] tracking-wide">RISE CREW</span>
        </Link>
        <nav aria-label={t('primary')} className="hidden items-center gap-7 text-white md:flex">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="underline-offset-4 hover:underline">
              {item.label}
            </Link>
          ))}
          <LocaleSwitch />
          <Link
            href="/join"
            className="text-cobalt rounded bg-white px-4 py-2 font-semibold transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            {t('join')}
          </Link>
        </nav>
        <MobileNav items={items} joinLabel={t('join')} menuLabel={t('menu')} />
      </div>
    </header>
  );
}
