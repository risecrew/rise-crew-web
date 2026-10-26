import { notFound } from 'next/navigation';
import { isLocale, type Locale } from './locales';

export function asLocale(value: string): Locale {
  if (!isLocale(value)) notFound();
  return value;
}
