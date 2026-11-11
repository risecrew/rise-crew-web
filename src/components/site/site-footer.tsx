import { getTranslations } from 'next-intl/server';
import { RiseSymbol } from '@/components/brand/rise-symbol';
import { Link } from '@/i18n/navigation';
import { isAuthEnabled } from '@/lib/auth/config';
import { FooterAccountLink } from './account-menu';
import { LocaleSwitch } from './locale-switch';

// Every page ends here (wireframe v1.1, §7). The email address is written out once, in the
// partnership block at the end of the home; the footer leads there instead of repeating it.
export async function SiteFooter() {
  const t = await getTranslations('Footer');
  const auth = await getTranslations('Auth.menu');

  return (
    // Every page ends on the stage colour, so the footer rises out of it into cobalt instead of
    // starting on a hard edge.
    <footer className="bg-[linear-gradient(180deg,var(--color-stage),var(--color-cobalt)_65%)] text-white">
      {/* The header already lists every page, so the footer keeps only what it does not: the
          partnership block, the account and the language, side by side. */}
      <div className="shell flex flex-col gap-8 pt-24 pb-14 md:flex-row md:items-end md:justify-between md:pt-32">
        <div>
          <RiseSymbol className="h-10 w-auto" />
          <p className="mt-4 font-display text-2xl font-bold">RISE CREW</p>
          <p className="mt-2 break-keep text-white/80">{t('supportedBy')}</p>
          <p className="mt-1 text-sm break-keep text-white/64">{t('address')}</p>
        </div>
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
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
