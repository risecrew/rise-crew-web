import { getTranslations } from 'next-intl/server';
import { Guilloche } from '@/components/passport/guilloche';
import { SectionHeading } from '@/components/site/section-heading';
import type { Press } from '@/content/schema';
import type { Locale } from '@/i18n/locales';
import { pick } from '@/lib/content';
import { formatStampDate } from '@/lib/passport';

export async function PressSection({ locale, press }: { locale: Locale; press: Press[] }) {
  const t = await getTranslations('Home.press');
  return (
    <section aria-labelledby="press-title" className="relative isolate bg-paper">
      <Guilloche palette="blue" className="absolute inset-0 -z-10 opacity-60" />
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-24">
        <SectionHeading id="press-title" title={t('title')} />
        <ul className="mt-10 divide-y divide-paper-edge border-y border-paper-edge">
          {press.map((item) => {
            const title = (
              <span lang="ko" className="text-lg font-semibold break-keep text-cobalt">
                {item.title}
              </span>
            );
            return (
              <li key={item.id} className="grid gap-2 py-6 md:grid-cols-[14rem_1fr]">
                <p className="text-sm text-ink-soft">
                  {pick(item.outlet, locale)} ·{' '}
                  <time dateTime={item.date} className="font-mono">
                    {formatStampDate(item.date, locale)}
                  </time>
                </p>
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-4 hover:underline"
                  >
                    {title}
                  </a>
                ) : (
                  title
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
