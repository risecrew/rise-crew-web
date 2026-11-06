'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

// What a page shows when it cannot be built, for example when the database does not answer. The
// site's own frame stays around it, with a way to try again.
export default function ErrorPage({ retry }: { retry: () => void }) {
  const t = useTranslations('Error');
  return (
    <main
      id="main"
      className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-clip bg-stage px-5 pt-32 pb-20 text-white md:px-10"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-[80svh] bg-[radial-gradient(ellipse_75%_65%_at_50%_0%,rgb(0_62_145/0.6),transparent_70%)]"
      />
      <div className="w-full max-w-lg">
        <h1 className="font-display text-[clamp(2rem,6vw,3.4rem)] leading-[1.04] font-[850] text-balance break-keep">
          {t('title')}
        </h1>
        <p className="mt-4 text-lg break-keep text-white/85">{t('body')}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border border-white/50 px-6 py-3 font-semibold text-white transition-[background-color,scale] duration-150 ease-out hover:bg-white/10 active:scale-[0.97]"
          >
            {t('retry')}
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center px-3 underline underline-offset-4"
          >
            {t('home')}
          </Link>
        </div>
      </div>
    </main>
  );
}
