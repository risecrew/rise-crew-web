import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DataField, DataPage } from '@/components/passport/data-page';
import { FIELD } from '@/components/passport/labels';
import { PageCover } from '@/components/site/page-cover';
import { SectionHeading } from '@/components/site/section-heading';
import { asLocale } from '@/i18n/as-locale';
import { localizedAlternates } from '@/lib/metadata';
import { toMrz } from '@/lib/passport';

const EMAIL = 'risecrew4@gmail.com';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Meta.contact' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: localizedAlternates(locale, '/contact'),
  };
}

export default async function ContactPage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('Contact');
  const footer = await getTranslations('Footer');
  const cta = await getTranslations('Cta');
  const partnerHref = `mailto:${EMAIL}?subject=${encodeURIComponent(t('partnerSubject'))}`;

  return (
    <main id="main">
      <PageCover title={t('title')} lead={t('lead')} />
      <section aria-labelledby="contact-title" className="bg-paper">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-2">
          <DataPage mrz={toMrz(['RISE CREW', 'SEOUL', 'KOR'])}>
            <DataField label={FIELD.email} wide>
              <a href={`mailto:${EMAIL}`} className="underline underline-offset-4">
                {EMAIL}
              </a>
            </DataField>
            <DataField label={FIELD.address} wide>
              {footer('address')}
              <span className="mt-1 block text-base font-normal text-ink-soft">{t('room')}</span>
            </DataField>
          </DataPage>
          <div>
            <SectionHeading id="contact-title" title={t('partnerTitle')} body={t('partnerBody')} />
            <a
              href={partnerHref}
              className="mt-8 inline-block rounded bg-cobalt px-6 py-4 font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
            >
              {cta('partner')}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
