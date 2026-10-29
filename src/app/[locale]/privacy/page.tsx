// Draft from a standard template; must be approved by operators and the ANCHOR Division before the switch is turned on.
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageCover } from '@/components/site/page-cover';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { isAuthEnabled } from '@/lib/auth/config';
import { PRIVACY_POLICY_VERSION } from '@/lib/auth/profile';
import { localizedAlternates } from '@/lib/metadata';

const EMAIL = 'risecrew4@gmail.com';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Meta.privacy' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: localizedAlternates(locale, '/privacy'),
  };
}

// The nine sections follow the order the spec lists them (§8). Each one is a heading beside its
// text, the way the site's inner pages set a title beside its facts. The numbers are there to be
// quoted ("see section 6"), which is what numbering a policy is for.
function Section({
  number,
  id,
  title,
  children,
}: {
  number: number;
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="grid gap-6 border-t border-white/10 py-12 first:border-t-0 md:py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16"
    >
      <h2
        id={id}
        className="flex gap-3 font-display text-2xl leading-[1.25] font-[850] text-balance break-keep text-white md:text-3xl"
      >
        <span className="shrink-0 text-lime tabular-nums">{number}.</span> <span>{title}</span>
      </h2>
      <div className="max-w-[68ch] space-y-5 leading-[1.75] break-keep text-white/80">
        {children}
      </div>
    </section>
  );
}

// Ruled rows, label above and text below, like the site's other fact lists.
function Rows({ children }: { children: ReactNode }) {
  return <dl>{children}</dl>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t border-white/15 py-4">
      <dt className="font-semibold text-white">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

const underlined = 'underline underline-offset-4';

export default async function PrivacyPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('Privacy');

  // The address in the text is a link, so a reader can write from the page.
  const mail = (chunks: ReactNode) => (
    <a href={`mailto:${EMAIL}`} className={underlined}>
      {chunks}
    </a>
  );
  // My page exists only once accounts are switched on; until then the policy (which can be read
  // with the switch off) names it in plain text instead of linking to a 404.
  const me = (chunks: ReactNode) =>
    isAuthEnabled() ? (
      <Link href="/me" className={underlined}>
        {chunks}
      </Link>
    ) : (
      chunks
    );

  return (
    <main id="main" className="bg-stage">
      <PageCover title={t('title')} lead={t('lead')} />
      <div className="border-t border-white/10 text-white">
        <div className="mx-auto max-w-7xl px-5 md:px-10">
          <Section number={1} id="privacy-purpose" title={t('purpose.title')}>
            <p>{t('purpose.intro')}</p>
            <Rows>
              {(['account', 'community', 'recruit'] as const).map((key) => (
                <Row key={key} label={t(`purpose.${key}.label`)}>
                  {t(`purpose.${key}.body`)}
                </Row>
              ))}
            </Rows>
          </Section>

          <Section number={2} id="privacy-items" title={t('items.title')}>
            <p>{t('items.intro')}</p>
            <Rows>
              {(
                [
                  'email',
                  'name',
                  'occupation',
                  'school',
                  'affiliation',
                  'age14',
                  'privacy',
                  'recruit',
                ] as const
              ).map((key) => (
                <Row key={key} label={t(`items.${key}.label`)}>
                  {t(`items.${key}.body`)}
                </Row>
              ))}
            </Rows>
            <p>{t('items.passive')}</p>
            <p>{t('items.cookies')}</p>
          </Section>

          <Section number={3} id="privacy-retention" title={t('retention.title')}>
            <p>{t('retention.keep')}</p>
            <p>{t('retention.unfinished')}</p>
            <p>{t('retention.delete')}</p>
          </Section>

          <Section number={4} id="privacy-processors" title={t('processors.title')}>
            <p>{t('processors.intro')}</p>
            <Rows>
              {(['supabase', 'vercel', 'google'] as const).map((key) => (
                <Row key={key} label={t(`processors.${key}.label`)}>
                  {t(`processors.${key}.body`)}
                </Row>
              ))}
            </Rows>
          </Section>

          <Section number={5} id="privacy-visibility" title={t('visibility.title')}>
            <Rows>
              {(['self', 'staff'] as const).map((key) => (
                <Row key={key} label={t(`visibility.${key}.label`)}>
                  {t(`visibility.${key}.body`)}
                </Row>
              ))}
            </Rows>
            <p>{t('visibility.outro')}</p>
          </Section>

          <Section number={6} id="privacy-rights" title={t('rights.title')}>
            <p>{t.rich('rights.manage', { me })}</p>
            <p>{t('rights.decline')}</p>
            <p>{t.rich('rights.unfinished', { mail })}</p>
          </Section>

          <Section number={7} id="privacy-under14" title={t('under14.title')}>
            <p>{t('under14.body')}</p>
          </Section>

          <Section number={8} id="privacy-officer" title={t('officer.title')}>
            <p>{t('officer.intro')}</p>
            <div className="border-t border-white/15 pt-4 text-lg font-semibold text-white">
              <p>{t.rich('officer.responsible', { mail })}</p>
              <p className="mt-1">{t('officer.handler')}</p>
            </div>
            <p className="text-sm text-white/60">{t('officer.note')}</p>
          </Section>

          <Section number={9} id="privacy-version" title={t('version.title')}>
            <p>{t('version.body')}</p>
            <Rows>
              <Row label={t('version.label')}>
                <time dateTime={PRIVACY_POLICY_VERSION} className="font-mono text-white">
                  {PRIVACY_POLICY_VERSION}
                </time>
              </Row>
            </Rows>
          </Section>
        </div>
      </div>
    </main>
  );
}
