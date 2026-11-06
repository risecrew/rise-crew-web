import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PRIMARY, TEXT_BUTTON, TITLE } from '@/components/teams/form-parts';
import { CHIP } from '@/components/teams/post-list';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { isAuthEnabled } from '@/lib/auth/config';
import { requireRole } from '@/lib/auth/viewer';
import { getNotices } from '@/lib/board/queries';
import { postDate } from '@/lib/teams/text';
import { AccountLayout, accountMetadata } from '../../account-layout';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Admin.notices' });
  return accountMetadata(t('title'));
}

export default async function AdminNoticesPage({ params }: Props) {
  if (!isAuthEnabled()) notFound();
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  await requireRole(locale, 'operator', `/${locale}/admin/notices`);

  const t = await getTranslations('Admin.notices');
  const board = await getTranslations('Board');
  const notices = await getNotices();

  return (
    <AccountLayout>
      <div className="w-full max-w-[75rem] flex-1">
        <h1 className={TITLE}>{t('title')}</h1>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/admin/notices/new" className={PRIMARY}>
            {t('new')}
          </Link>
          <Link href="/notices" className={TEXT_BUTTON}>
            {t('toPage')}
          </Link>
        </div>
        {notices.length > 0 ? (
          <ul className="mt-10 border-b border-white/15">
            {notices.map((notice) => (
              <li key={notice.id} className="border-t border-white/15">
                <Link
                  href={`/admin/notices/${notice.id}`}
                  className="grid min-h-14 gap-x-6 gap-y-1 py-4 hover:bg-white/5 sm:grid-cols-[9rem_1fr]"
                >
                  <span className="font-mono text-sm text-white/60">
                    {postDate(notice.created_at, locale)}
                  </span>
                  <span className="break-keep">
                    {notice.title_ko}
                    {notice.is_pinned ? (
                      <span className={`ml-2 ${CHIP}`}>{board('pinned')}</span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-10 text-lg break-keep text-white/75">{t('empty')}</p>
        )}
      </div>
    </AccountLayout>
  );
}
