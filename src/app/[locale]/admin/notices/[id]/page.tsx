import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NoticeForm } from '@/components/board/notice-form';
import { DeleteItem } from '@/components/board/delete-item';
import { ROW, TITLE } from '@/components/teams/form-parts';
import { asLocale } from '@/i18n/as-locale';
import { isAuthEnabled } from '@/lib/auth/config';
import { requireRole } from '@/lib/auth/viewer';
import { readAttachments } from '@/lib/board/forms';
import { getNotice, signNoticeFiles } from '@/lib/board/queries';
import { AccountLayout, accountMetadata } from '../../../account-layout';
import { deleteNotice } from '../actions';

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Admin.notices' });
  return accountMetadata(t('edit'));
}

export default async function EditNoticePage({ params }: Props) {
  if (!isAuthEnabled()) notFound();
  const { locale: rawLocale, id } = await params;
  const locale = asLocale(rawLocale);
  setRequestLocale(locale);
  await requireRole(locale, 'operator', `/${locale}/admin/notices/${id}`);

  const notice = await getNotice(id);
  if (!notice) notFound();
  const t = await getTranslations('Admin.notices');
  const { photos } = await signNoticeFiles(notice);

  return (
    <AccountLayout>
      <div className="w-full max-w-3xl flex-1">
        <h1 className={TITLE}>{t('edit')}</h1>
        <NoticeForm
          notice={{ ...notice, attachments: readAttachments(notice.attachments) }}
          photoUrls={Object.fromEntries(photos.map((photo) => [photo.path, photo.url]))}
        />
        <div className={`${ROW} mt-10`}>
          <DeleteItem id={notice.id} question={t('deleteQuestion')} action={deleteNotice} />
        </div>
      </div>
    </AccountLayout>
  );
}
