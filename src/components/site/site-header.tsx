import { getTranslations } from 'next-intl/server';
import { RiseSymbol } from '@/components/brand/rise-symbol';
import { Link } from '@/i18n/navigation';
import { isAuthEnabled } from '@/lib/auth/config';
import { AccountMenu } from './account-menu';
import { LocaleSwitch } from './locale-switch';
import { MobileNav } from './mobile-nav';

// The menu, for the header, the phone menu and the footer. The team pages belong to accounts, so
// with the switch off the menu is exactly what it was before they existed.
export function getNavItems() {
  return [
    { href: '/', key: 'home' },
    { href: '/about', key: 'about' },
    ...(isAuthEnabled()
      ? ([
          { href: '/startups', key: 'startups' },
          { href: '/activities', key: 'activities' },
          { href: '/notices', key: 'notices' },
        ] as const)
      : []),
    { href: '/network', key: 'network' },
    { href: '/contact', key: 'contact' },
  ] as const;
}

async function getAccountLabels() {
  const t = await getTranslations('Auth.menu');
  return {
    signIn: t('signIn'),
    account: t('account'),
    myPage: t('myPage'),
    members: t('members'),
    teams: t('teams'),
    activities: t('activities'),
    notices: t('notices'),
    signOut: t('signOut'),
  };
}

export async function SiteHeader() {
  const t = await getTranslations('Nav');
  const items = getNavItems().map((item) => ({ href: item.href, label: t(item.key) }));

  // With accounts switched off the header is exactly what it was before they existed.
  const accountLabels = isAuthEnabled() ? await getAccountLabels() : null;

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-cobalt"
      >
        {t('skip')}
      </a>
      {/* The content width every page uses; the home's opening sets its slogan in the same width,
          so the logo stands over the R and the last item over the hero's button. */}
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
          {accountLabels ? <AccountMenu labels={accountLabels} /> : null}
        </nav>
        <MobileNav
          items={items}
          menuLabel={t('menu')}
          account={accountLabels ? <AccountMenu labels={accountLabels} variant="panel" /> : null}
        />
      </div>
    </header>
  );
}
