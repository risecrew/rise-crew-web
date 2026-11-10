import { z } from 'zod';

// The same numbers as the constraints in supabase/migrations/20261106100000_activities_notices.sql.
// The forms check first so a person gets a message; the database has the last word.
export const BOARD_LIMITS = {
  activityTitle: 200,
  city: 50,
  summary: 500,
  body: 5000,
  results: 1000,
} as const;

// A year, a year and month, or a full date that exists on the calendar.
export function isActivityDate(value: string): boolean {
  if (/^\d{4}$/.test(value) || /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return true;
  const full = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!full) return false;
  const [year, month, day] = [Number(full[1]), Number(full[2]), Number(full[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// Browsers send a line break in a textarea as CRLF. Saved as LF, so a limit counts what a person
// sees and the database counts the same number.
function optionalText(max: number) {
  return z
    .string()
    .transform((value) => value.replace(/\r\n/g, '\n').trim())
    .pipe(z.string().max(max, 'tooLong'));
}

function requiredText(max: number) {
  return z
    .string()
    .transform((value) => value.replace(/\r\n/g, '\n').trim())
    .pipe(z.string().min(1, 'required').max(max, 'tooLong'));
}

const optionalDate = z
  .string()
  .trim()
  .refine((value) => value === '' || isActivityDate(value), 'invalidDate')
  .transform((value) => (value === '' ? null : value));

export const activitySchema = z
  .object({
    date: optionalDate,
    // The last day, for something that ran over several days.
    end_date: optionalDate,
    title_ko: requiredText(BOARD_LIMITS.activityTitle),
    title_en: optionalText(BOARD_LIMITS.activityTitle),
    city_ko: requiredText(BOARD_LIMITS.city),
    city_en: optionalText(BOARD_LIMITS.city),
    summary_ko: optionalText(BOARD_LIMITS.summary),
    summary_en: optionalText(BOARD_LIMITS.summary),
    body_ko: optionalText(BOARD_LIMITS.body),
    body_en: optionalText(BOARD_LIMITS.body),
    results_ko: optionalText(BOARD_LIMITS.results),
    results_en: optionalText(BOARD_LIMITS.results),
    is_planned: z.boolean(),
  })
  // An end needs a start, and never comes before it (dates written the same way sort as text).
  .refine((v) => v.end_date === null || (v.date !== null && v.end_date >= v.date), {
    path: ['end_date'],
    message: 'endBeforeStart',
  });

// What an operator's form hears back.
export type BoardState =
  { ok: true } | { ok: false; error: BoardError; fields?: Record<string, string> } | null;
export type BoardError = 'denied' | 'invalid' | 'failed';
