import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

type Query = Record<string, string | number>;

const LINK = 'inline-flex min-h-11 items-center px-3 text-white underline underline-offset-4';

// Previous and next for a list whose state is in the address. Nothing shows for a single page.
export function Pager({
  pathname,
  query = {},
  page,
  pages,
}: {
  pathname: string;
  query?: Query;
  page: number;
  pages: number;
}) {
  const t = useTranslations('Teams.pager');
  if (pages <= 1 && page <= 1) return null;
  return (
    <nav
      aria-label={t('label')}
      className="mt-8 flex items-center gap-2 border-t border-white/15 pt-4"
    >
      {page > 1 ? (
        <Link
          className={LINK}
          href={{ pathname, query: { ...query, page: Math.min(page - 1, pages) } }}
        >
          {t('previous')}
        </Link>
      ) : null}
      <span className="px-3 text-sm text-white/60 tabular-nums">
        {t('status', { page, pages: Math.max(page, pages) })}
      </span>
      {page < pages ? (
        <Link className={LINK} href={{ pathname, query: { ...query, page: page + 1 } }}>
          {t('next')}
        </Link>
      ) : null}
    </nav>
  );
}
