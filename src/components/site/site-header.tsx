import { getTranslations } from 'next-intl/server';
import { RiseSymbol } from '@/components/brand/rise-symbol';
import { Link } from '@/i18n/navigation';
import { isAuthEnabled } from '@/lib/auth/config';
import { getRecruitment } from '@/lib/content';
import { cn } from '@/lib/utils';
import { AccountMenu } from './account-menu';
import { HeaderBar } from './header-bar';
import { LocaleSwitch } from './locale-switch';
import { MobileNav } from './mobile-nav';
import { PrimaryNav } from './primary-nav';

// The menu, for the header, the phone menu and the footer (wireframe v1.1, §6.2; the logo is the
// way home). The team pages belong to accounts, so with the switch off they are not in it.
export function getNavItems() {
  return [
    { href: '/about', key: 'about' },
    { href: '/program', key: 'program' },
    ...(isAuthEnabled()
      ? ([
          { href: '/startups', key: 'startups' },
          { href: '/activities', key: 'activities' },
          // Approved accounts only: see ApprovedOnly.
          { href: '/notices', key: 'notices', approvedOnly: true },
        ] as const)
      : []),
    { href: '/network', key: 'network' },
  ] as const;
}

// What the apply button says: "apply" while recruitment is open, "how to apply" otherwise. It
// always leads to the join page, which has the form link.
export async function getApplyLabel() {
  const t = await getTranslations('Nav');
  return (await getRecruitment()).status === 'open' ? t('apply') : t('applyInfo');
}

// The same, on a page's own button, where there is room to say "see how to apply".
export async function getApplyButtonLabel() {
  const t = await getTranslations('Nav');
  return (await getRecruitment()).status === 'open' ? t('apply') : t('applyInfoLong');
}

const APPLY =
  'inline-flex items-center justify-center rounded-full bg-lime font-semibold text-cobalt transition-transform duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.97]';

async function getAccountLabels() {
  const t = await getTranslations('Auth.menu');
  return {
    signIn: t('signIn'),
    account: t('account'),
    myPage: t('myPage'),
    myTeam: t('myTeam'),
    members: t('members'),
    teams: t('teams'),
    activities: t('activities'),
    notices: t('notices'),
    signOut: t('signOut'),
  };
}

export async function SiteHeader() {
  const t = await getTranslations('Nav');
  const items = getNavItems().map((item) => ({
    href: item.href,
    label: t(item.key),
    approvedOnly: 'approvedOnly' in item,
  }));
  const applyLabel = await getApplyLabel();

  // With accounts switched off the header has no account entry at all.
  const accountLabels = isAuthEnabled() ? await getAccountLabels() : null;
  // Two pages more in the menu with accounts on, so the full menu needs a wider window.
  const wide = accountLabels ? 'lg' : 'md';

  return (
    <HeaderBar>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-cobalt"
      >
        {t('skip')}
      </a>
      <div className="shell flex h-14 items-center justify-between gap-6 md:h-[72px]">
        <Link href="/" className="flex items-center gap-2 text-white">
          <RiseSymbol className="h-7 w-auto" />
          <span className="font-display text-lg font-bold tracking-wide">RISE CREW</span>
        </Link>
        <div className={cn('hidden items-center gap-8', wide === 'lg' ? 'lg:flex' : 'md:flex')}>
          <PrimaryNav items={items} label={t('primary')} />
          <div className="flex items-center gap-4">
            <LocaleSwitch />
            <Link href="/join" className={cn(APPLY, 'h-10 px-5 text-[15px]')}>
              {applyLabel}
            </Link>
            {accountLabels ? <AccountMenu labels={accountLabels} /> : null}
          </div>
        </div>
        <div className={cn('flex items-center gap-1', wide === 'lg' ? 'lg:hidden' : 'md:hidden')}>
          <LocaleSwitch />
          <MobileNav
            items={items}
            labels={{ open: t('openMenu'), close: t('closeMenu'), menu: t('menu') }}
            className=""
            apply={
              <Link href="/join" className={cn(APPLY, 'h-12 w-full text-base')}>
                {applyLabel}
              </Link>
            }
            account={accountLabels ? <AccountMenu labels={accountLabels} variant="panel" /> : null}
          />
        </div>
      </div>
    </HeaderBar>
  );
}
