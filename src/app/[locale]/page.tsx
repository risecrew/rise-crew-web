import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FinalCta } from '@/components/home/final-cta';
import { IdentitySection } from '@/components/home/identity-section';
import { NetworkPreview } from '@/components/home/network-preview';
import { PassportCover } from '@/components/home/passport-cover';
import { PressSection } from '@/components/home/press-section';
import { RouteSection } from '@/components/home/route-section';
import { asLocale } from '@/i18n/as-locale';
import {
  applyCta,
  getMentors,
  getPartners,
  getPress,
  getPrograms,
  getRecruitment,
  getStamps,
  getStats,
} from '@/lib/content';
import { localizedAlternates } from '@/lib/metadata';

export const revalidate = 86400;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'Meta.home' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: localizedAlternates(locale, ''),
  };
}

export default async function HomePage({ params }: Props) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);

  const [stats, stamps, programs, mentors, partners, press, recruitment] = await Promise.all([
    getStats(),
    getStamps(),
    getPrograms(),
    getMentors(),
    getPartners(),
    getPress(),
    getRecruitment(),
  ]);
  const cta = applyCta(recruitment);
  const today = new Date();
  const mentorCount = stats.find((s) => s.id === 'mentors')?.value ?? String(mentors.length);

  return (
    <main id="main">
      <PassportCover locale={locale} stats={stats} cta={cta} />
      <IdentitySection />
      <RouteSection locale={locale} stamps={stamps} programs={programs} today={today} />
      <NetworkPreview
        locale={locale}
        mentorCount={mentorCount}
        mentors={mentors}
        partners={partners}
      />
      <PressSection locale={locale} press={press} />
      <FinalCta cta={cta} />
    </main>
  );
}
