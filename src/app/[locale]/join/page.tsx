import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EMAIL } from '@/components/home/contact';
import { PlusIcon } from '@/components/icons';
import { PRIMARY } from '@/components/site/buttons';
import { CopyButton } from '@/components/site/copy-button';
import { FaqHash } from '@/components/site/faq-hash';
import { PageCover } from '@/components/site/page-cover';
import { asLocale } from '@/i18n/as-locale';
import { getBenefits, getFaqs, getRecruitment, pick } from '@/lib/content';
import { localizedAlternates } from '@/lib/metadata';
import { cn } from '@/lib/utils';

type Props = { params: Promise<{ locale: string }> };

const SECTION = 'section-y border-t border-white/10 text-white';
const KINDS = ['team', 'solo', 'individual'] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Meta.join' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: localizedAlternates(locale, '/join'),
  };
}

// What to do next, whether or not we are recruiting (wireframe v1.1, §14). Rows without a value are
// left out until the organizers confirm them.
export default async function JoinPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('Join');
  const [recruitment, benefits, faqs] = await Promise.all([
    getRecruitment(),
    getBenefits(),
    getFaqs(),
  ]);
  const open = recruitment.status === 'open';

  return (
    <main id="main" className="bg-stage">
      <PageCover eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />

      <section aria-labelledby="status-title" className="text-white">
        <div className="shell">
          <h2 id="status-title" className="sr-only">
            {t('status.title')}
          </h2>
          <dl className="grid gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-10 md:p-8">
            <div>
              <dt className="sr-only">{t('status.label')}</dt>
              <dd>
                <span
                  className={cn(
                    'inline-flex rounded-full px-3 py-1 text-[13px] font-semibold',
                    open ? 'bg-lime text-cobalt' : 'bg-white/15 text-white',
                  )}
                >
                  {open ? t('status.open') : t('status.closed')}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-white/64">{t('status.period')}</dt>
              <dd className="mt-1 text-base break-keep">
                {open
                  ? pick(recruitment.period, locale)
                  : recruitment.nextNotice
                    ? pick(recruitment.nextNotice, locale)
                    : t('status.next')}
              </dd>
            </div>
            {open ? (
              <div>
                <dt className="sr-only">{t('status.apply')}</dt>
                <dd>
                  <a
                    href={recruitment.applyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={PRIMARY}
                  >
                    {t('status.apply')}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </section>

      <section aria-labelledby="who-title" className={cn(SECTION, 'mt-[72px] md:mt-24')}>
        <div className="shell">
          <h2 id="who-title" className="font-display text-headline">
            {t('who.title')}
          </h2>
          {/* A phone scrolls the table sideways; the keyboard can too. */}
          <div
            role="region"
            aria-labelledby="who-title"
            tabIndex={0}
            className="section-gap overflow-x-auto"
          >
            <table className="w-full min-w-[520px] border-collapse text-left text-base">
              <thead>
                <tr className="border-b border-white/15 text-sm text-white/64">
                  <th scope="col" className="py-3 pr-6 font-semibold">
                    {t('who.columns.who')}
                  </th>
                  <th scope="col" className="py-3 pr-6 font-semibold">
                    {t('who.columns.join')}
                  </th>
                  <th scope="col" className="py-3 font-semibold">
                    {t('who.columns.benefits')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(['skku', 'others'] as const).map((row) => (
                  <tr key={row} className="border-b border-white/10">
                    <th scope="row" className="py-4 pr-6 font-semibold break-keep">
                      {t(`who.${row}.who`)}
                    </th>
                    <td className="py-4 pr-6">{t(`who.${row}.join`)}</td>
                    <td className="py-4 break-keep text-white/80">{t(`who.${row}.benefits`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-6 flex flex-wrap gap-2" aria-label={t('who.kinds')}>
            {KINDS.map((kind) => (
              <li
                key={kind}
                className="rounded-full border border-white/20 px-3 py-1 text-[13px] font-semibold"
              >
                {t(`who.kind.${kind}`)}
              </li>
            ))}
          </ul>
          {/* TODO(운영진 확인): the selection steps and the activity details (period, meetings, required
              sessions, completion, fee) go here once confirmed (wireframe v1.1, §14 J4–J5). */}
        </div>
      </section>

      <section aria-labelledby="benefits-title" className={SECTION}>
        <div className="shell">
          <h2 id="benefits-title" className="font-display text-headline">
            {t('benefits.title')}
          </h2>
          <ul className="section-gap grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <li
                key={benefit.id}
                data-benefit
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <h3 className="font-display text-subhead break-keep">
                  {pick(benefit.title, locale)}
                </h3>
                <p className="mt-2 text-base break-keep text-white/80">
                  {pick(benefit.body, locale)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="faq-title" className={SECTION}>
        <div className="shell max-w-[calc(800px+48px)]">
          <h2 id="faq-title" className="font-display text-headline">
            {t('faq.title')}
          </h2>
          <ul className="section-gap border-b border-white/15">
            {faqs.map((faq) => (
              <li key={faq.id} className="border-t border-white/15">
                {/* One open at a time: the browser closes the others in the same group. */}
                <details id={`faq-${faq.id}`} name="faq" className="group scroll-mt-[88px] py-5">
                  <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-6 text-lg font-semibold break-keep [&::-webkit-details-marker]:hidden">
                    {pick(faq.question, locale)}
                    <PlusIcon className="mt-1 text-lime transition-transform duration-200 ease-out group-open:rotate-45" />
                  </summary>
                  <p className="mt-3 text-base break-keep text-white/80">
                    {pick(faq.answer, locale)}
                  </p>
                </details>
              </li>
            ))}
          </ul>
          <FaqHash />
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base break-keep text-white/80">
              {t('ask')} <span className="font-semibold text-white select-all">{EMAIL}</span>
            </p>
            <CopyButton text={EMAIL} label={t('copy')} done={t('copied')} />
          </div>
        </div>
      </section>
    </main>
  );
}
