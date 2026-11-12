import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PRIMARY, SECONDARY } from './buttons';
import { getApplyButtonLabel } from './site-header';

// The closing band of the about, program and network pages (wireframe v1.1, §9 A6). The network
// page speaks to mentors and partners, not applicants, so it offers the partnership link alone.
export async function CtaBand({
  title,
  partnerOnly = false,
}: {
  title?: string;
  partnerOnly?: boolean;
}) {
  const t = await getTranslations('CtaBand');
  const apply = await getApplyButtonLabel();
  return (
    <section aria-labelledby="cta-title" className="border-t border-white/10 section-y text-white">
      <div className="shell flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <h2 id="cta-title" className="font-display text-headline text-balance break-keep">
          {title ?? t('title')}
        </h2>
        <div className="flex flex-wrap gap-3">
          {partnerOnly ? null : (
            <Link href="/join" className={PRIMARY}>
              {apply}
            </Link>
          )}
          <Link
            href={{ pathname: '/', hash: 'contact' }}
            className={partnerOnly ? PRIMARY : SECONDARY}
          >
            {t('partner')}
          </Link>
        </div>
      </div>
    </section>
  );
}
