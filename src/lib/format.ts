import type { Localized } from '@/content/schema';
import type { Locale } from '@/i18n/locales';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Dates in content are YYYY, YYYY-MM or YYYY-MM-DD; show only the precision we actually know.
// Korean `2025.12.12`, English `Dec 12, 2025` (wireframe v1.1, §5.5 and §19).
export function formatStampDate(date: string, locale: Locale): string {
  const [year, month, day] = date.split('-');
  if (!month) return year;
  if (locale === 'ko') return day ? `${year}.${month}.${day}` : `${year}.${month}`;
  const name = MONTHS[Number(month) - 1];
  return day ? `${name} ${Number(day)}, ${year}` : `${name} ${year}`;
}

// A date, or a span of days. Only a span of whole days is shortened; anything less precise falls
// back to the two dates in full.
export function formatDateRange(start: string, end: string | undefined, locale: Locale): string {
  if (!end || end === start) return formatStampDate(start, locale);
  const [y1, m1, d1] = start.split('-');
  const [y2, m2, d2] = end.split('-');
  if (!d1 || !d2) return `${formatStampDate(start, locale)}–${formatStampDate(end, locale)}`;

  if (locale === 'ko') {
    return y1 === y2 ? `${y1}.${m1}.${d1}–${m2}.${d2}` : `${y1}.${m1}.${d1}–${y2}.${m2}.${d2}`;
  }
  const n1 = MONTHS[Number(m1) - 1];
  const n2 = MONTHS[Number(m2) - 1];
  if (y1 !== y2) return `${n1} ${Number(d1)}, ${y1} – ${n2} ${Number(d2)}, ${y2}`;
  if (m1 !== m2) return `${n1} ${Number(d1)} – ${n2} ${Number(d2)}, ${y1}`;
  return `${n1} ${Number(d1)}–${Number(d2)}, ${y1}`;
}

// A photo's caption: official name · place · date, built from the activity it belongs to. Awards
// and descriptions never go here (wireframe v1.1, §5.5).
export function formatCaption(
  event: { title: Localized; city: Localized; date?: string; endDate?: string },
  locale: Locale,
): string {
  const parts = [event.title[locale], event.city[locale]];
  if (event.date) parts.push(formatDateRange(event.date, event.endDate, locale));
  return parts.join(' · ');
}
