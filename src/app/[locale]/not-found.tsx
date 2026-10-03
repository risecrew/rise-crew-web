import { getTranslations } from 'next-intl/server';
import { PageCover } from '@/components/site/page-cover';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('NotFound');
  return (
    <main id="main" className="bg-stage">
      <PageCover title={t('title')} lead={t('body')}>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-lime px-6 py-3 font-semibold text-cobalt"
        >
          {t('home')}
        </Link>
      </PageCover>
    </main>
  );
}
