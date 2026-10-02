import { getTranslations } from 'next-intl/server';
import { RiseSymbol } from '@/components/brand/rise-symbol';
import { Link } from '@/i18n/navigation';
import { NAV_ITEMS } from './site-header';

export async function SiteFooter() {
  const t = await getTranslations('Footer');
  const nav = await getTranslations('Nav');

  return (
    <footer className="bg-cobalt text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:px-10">
        <div>
          <RiseSymbol className="h-10 w-auto" />
          <p className="mt-4 font-display text-2xl font-[800]">RISE CREW</p>
          <p className="mt-2 text-white/85">{t('tagline')}</p>
          <p className="mt-1 text-sm break-keep text-white/75">{t('supportedBy')}</p>
        </div>
        <nav aria-label={nav('footer')}>
          <ul className="flex flex-col gap-2">
            {[...NAV_ITEMS, { href: '/join', key: 'join' } as const].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="underline-offset-4 hover:underline">
                  {nav(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="text-sm text-white/85">
          <a href="mailto:risecrew4@gmail.com" className="underline-offset-4 hover:underline">
            risecrew4@gmail.com
          </a>
          <p className="mt-2 break-keep">{t('address')}</p>
        </div>
      </div>
      <p className="border-t border-white/15 px-5 py-5 text-center text-xs tracking-[0.12em] text-white/75">
        {t('rights', { year: new Date().getFullYear() })}
      </p>
    </footer>
  );
}
