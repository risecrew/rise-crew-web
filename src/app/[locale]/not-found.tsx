import { getTranslations } from 'next-intl/server';
import { PageCover } from '@/components/site/page-cover';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('NotFound');
  const meta = await getTranslations('Meta.notFound');
  return (
    <main id="main" className="bg-stage">
      {/* not-found has no generateMetadata; React hoists this into the head. */}
      <title>{meta('title')}</title>
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
