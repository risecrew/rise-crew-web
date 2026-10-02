import { getTranslations } from 'next-intl/server';

export type StampLabels = {
  upcoming: string;
  unconfirmed: string;
  dateTbc: string;
  source: string;
};

export async function getStampLabels(): Promise<StampLabels> {
  const t = await getTranslations('Common');
  return {
    upcoming: t('upcoming'),
    unconfirmed: t('unconfirmed'),
    dateTbc: t('dateTbc'),
    source: t('source'),
  };
}
