import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('NotFound');
  return (
    <main id="main">
      <p>{t('kicker')}</p>
      <h1>{t('title')}</h1>
      <p>{t('body')}</p>
      <Link href="/">{t('home')}</Link>
    </main>
  );
}
