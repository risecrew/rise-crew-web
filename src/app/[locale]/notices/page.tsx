import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageCover } from '@/components/site/page-cover';
import { CHIP } from '@/components/teams/post-list';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { isAuthEnabled } from '@/lib/auth/config';
import { getNotices } from '@/lib/board/queries';
import { localized, showsFallback } from '@/lib/board/text';
import { localizedAlternates } from '@/lib/metadata';
import { postDate } from '@/lib/teams/text';

type Props = { params: Promise<{ locale: string }> };

export const revalidate = 86400;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isAuthEnabled()) return {};
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Board' });
  return {
    title: t('notices.metaTitle'),
    description: t('notices.lead'),
    alternates: localizedAlternates(locale, '/notices'),
  };
}

export default async function NoticesPage({ params }: Props) {
  if (!isAuthEnabled()) notFound();
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('Board');
  const notices = await getNotices();

  return (
    <main id="main" className="bg-stage">
      <PageCover title={t('notices.title')} lead={t('notices.lead')} />
      <section className="border-t border-white/10 bg-stage text-white">
        <div className="mx-auto max-w-7xl px-5 py-14 md:px-10 md:py-20">
          {notices.length > 0 ? (
            <ul className="border-b border-white/15">
              {notices.map((notice) => (
                <li key={notice.id} data-notice className="border-t border-white/15">
                  <Link
                    href={`/notices/${notice.id}`}
                    className="grid min-h-14 gap-x-6 gap-y-1 py-5 transition-colors duration-150 ease-out hover:bg-white/5 sm:grid-cols-[9rem_1fr]"
                  >
                    <time dateTime={notice.created_at} className="font-mono text-sm text-white/60">
                      {postDate(notice.created_at, locale)}
                    </time>
                    <span
                      lang={showsFallback(notice.title_en, locale) ? 'ko' : undefined}
                      className="text-lg font-semibold break-keep"
                    >
                      {notice.is_pinned ? (
                        <span className={`mr-2 align-middle ${CHIP}`}>{t('pinned')}</span>
                      ) : null}
                      {localized(notice.title_ko, notice.title_en, locale)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-lg break-keep text-white/75">{t('notices.empty')}</p>
          )}
        </div>
      </section>
    </main>
  );
}
