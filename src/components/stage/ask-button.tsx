import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { ApplyCta } from '@/lib/content';
import { cn } from '@/lib/utils';

const base =
  'inline-flex items-center justify-center rounded-full bg-lime px-6 py-3 font-semibold text-cobalt transition-transform duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.97]';

// The deck's primary action. While recruitment is closed it leads to the join page instead of
// a dead form link.
export async function AskButton({ cta, className }: { cta: ApplyCta; className?: string }) {
  const t = await getTranslations('Cta');
  return cta.kind === 'apply' ? (
    <a href={cta.href} target="_blank" rel="noreferrer" className={cn(base, className)}>
      {t('apply')}
    </a>
  ) : (
    <Link href="/join" className={cn(base, className)}>
      {t('notice')}
    </Link>
  );
}
