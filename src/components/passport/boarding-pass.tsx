import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { ApplyCta } from '@/lib/content';
import { cn } from '@/lib/utils';

export async function BoardingPass({ cta, className }: { cta: ApplyCta; className?: string }) {
  const t = await getTranslations('Cta');
  const label = cta.kind === 'apply' ? t('apply') : t('notice');
  const classes = cn(
    'inline-flex items-stretch rounded-xl bg-paper text-left text-ink shadow-[0_12px_32px_-14px_rgb(0_0_0/0.5)] transition-transform duration-150 ease-out hover:-translate-y-0.5 active:translate-y-px active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-lime',
    className,
  );
  const inner = (
    <>
      <span className="flex flex-col gap-1 px-5 py-4">
        <span className="text-ink-soft text-[10px] font-semibold tracking-[0.25em] uppercase">
          {t('passLabel')}
        </span>
        <span className="font-display text-cobalt text-2xl leading-tight font-[850]">{label}</span>
        <span className="text-ink-soft font-mono text-[11px] tracking-[0.2em] uppercase">
          {t('route')}
        </span>
      </span>
      <span
        aria-hidden
        className="border-paper-edge text-ink-soft flex flex-col items-center justify-center border-l-2 border-dashed px-4 font-mono text-[10px] tracking-[0.2em] uppercase"
      >
        {t('gate')}
        <span className="font-display text-cobalt text-xl font-[800]">50322</span>
      </span>
    </>
  );

  return cta.kind === 'apply' ? (
    <a href={cta.href} target="_blank" rel="noreferrer" className={classes}>
      {inner}
    </a>
  ) : (
    <Link href="/join" className={classes}>
      {inner}
    </Link>
  );
}
