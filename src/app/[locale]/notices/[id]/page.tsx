import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PostBody } from '@/components/teams/post-body';
import { TEXT_BUTTON, TITLE } from '@/components/teams/form-parts';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { isAuthEnabled } from '@/lib/auth/config';
import { getNotice } from '@/lib/board/queries';
import { localized, showsFallback } from '@/lib/board/text';
import { localizedAlternates } from '@/lib/metadata';
import { postDate } from '@/lib/teams/text';

type Props = { params: Promise<{ locale: string; id: string }> };

export const revalidate = 86400;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isAuthEnabled()) return {};
  const { locale: rawLocale, id } = await params;
  const locale = asLocale(rawLocale);
  const notice = await getNotice(id);
  if (!notice) return {};
  return {
    title: localized(notice.title_ko, notice.title_en, locale),
    alternates: localizedAlternates(locale, `/notices/${id}`),
  };
}

export default async function NoticePage({ params }: Props) {
  if (!isAuthEnabled()) notFound();
  const { locale: rawLocale, id } = await params;
  const locale = asLocale(rawLocale);
  setRequestLocale(locale);
  const notice = await getNotice(id);
  if (!notice) notFound();
  const t = await getTranslations('Board');
  // Saving twice within a minute is one edit as far as a reader is concerned.
  const edited =
    new Date(notice.updated_at).getTime() - new Date(notice.created_at).getTime() > 60_000;

  return (
    <main id="main" className="min-h-svh bg-stage px-5 pt-32 pb-20 text-white md:px-10">
      <article className="mx-auto max-w-3xl">
        <h1 lang={showsFallback(notice.title_en, locale) ? 'ko' : undefined} className={TITLE}>
          {localized(notice.title_ko, notice.title_en, locale)}
        </h1>
        <p className="mt-5 font-mono text-sm text-white/65">
          {postDate(notice.created_at, locale)}
          {edited ? ` · ${t('edited', { date: postDate(notice.updated_at, locale) })}` : null}
        </p>
        <div lang={showsFallback(notice.body_en, locale) ? 'ko' : undefined} className="mt-8">
          <PostBody text={localized(notice.body_ko, notice.body_en, locale)} />
        </div>
        <Link href="/notices" className={`${TEXT_BUTTON} mt-10 -ml-3`}>
          {t('notices.toList')}
        </Link>
      </article>
    </main>
  );
}
