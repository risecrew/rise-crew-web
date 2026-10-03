import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageCover } from '@/components/site/page-cover';
import { SectionHeading } from '@/components/site/section-heading';
import { Fact, FactList } from '@/components/stage/facts';
import { FIELD } from '@/components/stage/labels';
import { asLocale } from '@/i18n/as-locale';
import { getPhoto, pick } from '@/lib/content';
import { localizedAlternates } from '@/lib/metadata';

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
  const home = await getTranslations('Home');
  const photo = await getPhoto('beyond-expo-macau-2026');
  const partnerHref = `mailto:${EMAIL}?subject=${encodeURIComponent(t('partnerSubject'))}`;

  return (
    <main id="main" className="bg-stage">
      <PageCover
        title={t('title')}
        lead={t('lead')}
        photo={photo ? { photo, locale, temporaryLabel: home('deck.temporary') } : undefined}
      />
      <section
        aria-labelledby="contact-title"
        className="border-t border-white/10 bg-stage text-white"
      >
        <div className="mx-auto grid max-w-7xl items-start gap-12 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-2">
          <div>
            <SectionHeading id="contact-title" title={t('partnerTitle')} body={t('partnerBody')} />
            <a
              href={partnerHref}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-lime px-6 py-3 font-semibold text-cobalt transition-transform duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.97]"
            >
              {cta('partner')}
            </a>
          </div>
          <FactList>
            <Fact label={pick(FIELD.email, locale)}>
              <a href={`mailto:${EMAIL}`} className="underline underline-offset-4">
                {EMAIL}
              </a>
            </Fact>
            <Fact label={pick(FIELD.address, locale)}>
              {footer('address')}
              <span className="mt-1 block text-base font-normal text-white/70">{t('room')}</span>
            </Fact>
          </FactList>
        </div>
      </section>
    </main>
  );
}
