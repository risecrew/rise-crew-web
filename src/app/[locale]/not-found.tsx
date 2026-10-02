import { getTranslations } from 'next-intl/server';
import { PageCover } from '@/components/site/page-cover';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('NotFound');
  return (
    <main id="main">
      <PageCover title={t('title')} lead={t('body')}>
        <Link
          href="/"
          className="text-cobalt mt-8 inline-block rounded bg-white px-5 py-3 font-semibold"
        >
          {t('home')}
        </Link>
      </PageCover>
    </main>
  );
}
