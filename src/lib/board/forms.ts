import { z } from 'zod';

// The same numbers as the constraints in supabase/migrations/20261106100000_activities_notices.sql.
// The forms check first so a person gets a message; the database has the last word.
export const BOARD_LIMITS = {
  activityTitle: 200,
  city: 50,
  summary: 500,
  noticeTitle: 100,
  noticeBody: 5000,
  noticePhotos: 4,
  noticeFiles: 5,
  noticeFileBytes: 10 * 1024 * 1024,
  noticeFileName: 200,
} as const;

// What a notice can carry, by ending, and the type each is stored under. Browsers disagree about what
// to call a Hangul file, so the ending decides. The same list as the notice-files bucket.
export const NOTICE_FILE_TYPES = {
  pdf: 'application/pdf',
  hwp: 'application/x-hwp',
  hwpx: 'application/hwp+zip',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
} as const;
type NoticeFileEnding = keyof typeof NOTICE_FILE_TYPES;

export const NOTICE_FILE_ACCEPT = Object.keys(NOTICE_FILE_TYPES)
  .map((ending) => `.${ending}`)
  .join(',');

export function noticeFileEnding(name: string): NoticeFileEnding | null {
  const ending = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase();
  return ending && Object.hasOwn(NOTICE_FILE_TYPES, ending) ? (ending as NoticeFileEnding) : null;
}

export function noticeFileContentType(name: string): string | null {
  const ending = noticeFileEnding(name);
  return ending ? NOTICE_FILE_TYPES[ending] : null;
}

export function noticeFileProblem(file: {
  name: string;
  size: number;
}): 'badType' | 'tooLarge' | null {
  if (!noticeFileEnding(file.name)) return 'badType';
  return file.size > BOARD_LIMITS.noticeFileBytes ? 'tooLarge' : null;
}

// The name a file is saved under on someone's computer: no folders or control characters, and short
// enough for the database, keeping its ending.
export function cleanFileName(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? '').replace(/[\p{Cc}]/gu, '').trim();
  if (base.length <= BOARD_LIMITS.noticeFileName) return base;
  const ending = /\.[a-z0-9]+$/i.exec(base)?.[0] ?? '';
  return base.slice(0, BOARD_LIMITS.noticeFileName - ending.length) + ending;
}

export const attachmentSchema = z.object({
  path: z.string().regex(/^[0-9a-f-]{36}\.(pdf|hwp|hwpx|doc|docx|xls|xlsx|ppt|pptx)$/),
  name: z.string().min(1).max(BOARD_LIMITS.noticeFileName),
  size: z.number().int().min(0).max(BOARD_LIMITS.noticeFileBytes),
});
export type Attachment = z.infer<typeof attachmentSchema>;

export const noticePhotosSchema = z
  .array(z.string().regex(/^[0-9a-f-]{36}\.(jpg|png|webp)$/))
  .max(BOARD_LIMITS.noticePhotos);
export const attachmentsSchema = z.array(attachmentSchema).max(BOARD_LIMITS.noticeFiles);

export function readAttachments(value: unknown): Attachment[] {
  const parsed = attachmentsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

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

export const activitySchema = z.object({
  date: z
    .string()
    .trim()
    .refine((value) => value === '' || isActivityDate(value), 'invalidDate')
    .transform((value) => (value === '' ? null : value)),
  title_ko: requiredText(BOARD_LIMITS.activityTitle),
  title_en: optionalText(BOARD_LIMITS.activityTitle),
  city_ko: requiredText(BOARD_LIMITS.city),
  city_en: optionalText(BOARD_LIMITS.city),
  summary_ko: optionalText(BOARD_LIMITS.summary),
  summary_en: optionalText(BOARD_LIMITS.summary),
  is_planned: z.boolean(),
});

export const noticeSchema = z.object({
  title_ko: requiredText(BOARD_LIMITS.noticeTitle),
  title_en: optionalText(BOARD_LIMITS.noticeTitle),
  body_ko: requiredText(BOARD_LIMITS.noticeBody),
  body_en: optionalText(BOARD_LIMITS.noticeBody),
  is_pinned: z.boolean(),
});

// What an operator's form hears back.
export type BoardState =
  { ok: true } | { ok: false; error: BoardError; fields?: Record<string, string> } | null;
export type BoardError = 'denied' | 'invalid' | 'failed';
