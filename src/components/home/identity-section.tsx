import { getTranslations } from 'next-intl/server';
import { DataField, DataPage } from '@/components/passport/data-page';
import { FIELD } from '@/components/passport/labels';
import { SectionHeading } from '@/components/site/section-heading';
import { toMrz } from '@/lib/passport';

export async function IdentitySection() {
  const t = await getTranslations('Home.identity');
  return (
    <section aria-labelledby="identity-title" className="bg-paper">
      {/* Extra top padding clears the cover's data page, which overlaps this section. */}
      <div className="mx-auto grid max-w-7xl items-start gap-12 px-5 pt-44 pb-20 md:px-10 md:pt-48 md:pb-28 lg:grid-cols-2">
        <SectionHeading id="identity-title" title={t('title')} body={t('body')} />
        <DataPage mrz={toMrz(['RISE CREW', 'ANCHOR', 'SKKU'])}>
          <DataField label={FIELD.name}>RISE CREW</DataField>
          <DataField label={FIELD.established}>2025</DataField>
          <DataField label={FIELD.affiliation} wide>
            {t('affiliation')}
          </DataField>
          <DataField label={FIELD.supporter} wide>
            {t('supporter')}
          </DataField>
          <DataField label={FIELD.partnership} wide>
            {t('mou')}
          </DataField>
        </DataPage>
      </div>
    </section>
  );
}
