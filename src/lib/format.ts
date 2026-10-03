import type { Locale } from '@/i18n/locales';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Dates in content are YYYY, YYYY-MM or YYYY-MM-DD; show only the precision we actually know.
export function formatStampDate(date: string, locale: Locale): string {
  const [year, month, day] = date.split('-');
  if (!month) return year;
  if (locale === 'ko') return day ? `${year}.${month}.${day}` : `${year}.${month}`;
  const name = MONTHS[Number(month) - 1];
  return day ? `${Number(day)} ${name} ${year}` : `${name} ${year}`;
}
