import { getTranslations } from 'next-intl/server';
import { RiseSymbol } from '@/components/brand/rise-symbol';
import { Link } from '@/i18n/navigation';
import { isAuthEnabled } from '@/lib/auth/config';
import { FooterAccountLink } from './account-menu';
import { ApprovedOnly } from './approved-only';
import { LocaleSwitch } from './locale-switch';
import { getNavItems } from './site-header';

// Every page ends here (wireframe v1.1, §7). The email address is written out once, in the
// partnership block at the end of the home; the footer leads there instead of repeating it.
export async function SiteFooter() {
  const t = await getTranslations('Footer');
  const nav = await getTranslations('Nav');
  const auth = await getTranslations('Auth.menu');
  const items = [...getNavItems(), { href: '/join', key: 'join' } as const];

  return (
    // Every page ends on the stage colour, so the footer rises out of it into cobalt instead of
    // starting on a hard edge.
    <footer className="bg-[linear-gradient(180deg,var(--color-stage),var(--color-cobalt)_65%)] text-white">
      <div className="shell grid gap-10 pt-24 pb-14 md:grid-cols-[1.6fr_1fr_1fr] md:pt-32">
        <div>
          <RiseSymbol className="h-10 w-auto" />
          <p className="mt-4 font-display text-2xl font-bold">RISE CREW</p>
          <p className="mt-2 break-keep text-white/80">{t('supportedBy')}</p>
          <p className="mt-1 text-sm break-keep text-white/64">{t('address')}</p>
        </div>
        <nav aria-label={nav('footer')}>
          <ul className="flex flex-col gap-2">
            {items.map((item) => {
              const row = (
                <li key={item.href}>
                  <Link href={item.href} className="underline-offset-4 hover:underline">
                    {nav(item.key)}
                  </Link>
                </li>
              );
              return 'approvedOnly' in item ? (
                <ApprovedOnly key={item.href}>{row}</ApprovedOnly>
              ) : (
                row
              );
            })}
          </ul>
        </nav>
        <ul className="flex flex-col gap-2">
          <li>
            <Link
              href={{ pathname: '/', hash: 'contact' }}
              className="underline-offset-4 hover:underline"
            >
              {t('contact')}
            </Link>
          </li>
          {isAuthEnabled() ? (
            <li>
              <FooterAccountLink signIn={auth('signIn')} myPage={auth('myPage')} />
            </li>
          ) : null}
          <li className="-my-2.5">
            <LocaleSwitch variant="footer" />
          </li>
        </ul>
      </div>
      <div className="shell flex flex-wrap items-center justify-center gap-x-6 border-t border-white/15 py-2 text-[13px] text-white/64">
        <p>
          {t('rights', { year: new Date().getFullYear() })} · {t('madeBy')}
        </p>
        {/* The policy opens together with the accounts. */}
        {isAuthEnabled() && (
          <Link href="/privacy" className="py-2 text-white/80 underline-offset-4 hover:underline">
            {t('privacy')}
          </Link>
        )}
      </div>
    </footer>
  );
}
