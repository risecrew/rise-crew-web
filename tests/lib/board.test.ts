import { describe, expect, it } from 'vitest';
import { activitySchema, BOARD_LIMITS, isActivityDate, readGallery } from '@/lib/board/forms';
import { activityTimeline, isUploadedPhoto, localized, showsFallback } from '@/lib/board/text';

const activity = {
  date: '2026-11-06',
  end_date: '',
  title_ko: '행사',
  title_en: '',
  city_ko: '서울',
  city_en: '',
  summary_ko: '',
  summary_en: '',
  body_ko: '',
  body_en: '',
  results_ko: '',
  results_en: '',
  is_planned: false,
};

describe('localized', () => {
  it('falls back to Korean when the English is empty', () => {
    expect(localized('한국어', '', 'en')).toBe('한국어');
    expect(showsFallback('', 'en')).toBe(true);
  });
  it('uses the English when there is some', () => {
    expect(localized('한국어', 'English', 'en')).toBe('English');
    expect(showsFallback('English', 'en')).toBe(false);
  });
  it('always uses the Korean on the Korean pages', () => {
    expect(localized('한국어', 'English', 'ko')).toBe('한국어');
    expect(showsFallback('', 'ko')).toBe(false);
  });
});

describe('isActivityDate', () => {
  it.each(['2026', '2026-11', '2026-11-06', '2024-02-29'])('accepts %s', (date) => {
    expect(isActivityDate(date)).toBe(true);
  });
  it.each(['2026-13', '2026-02-30', '2025-02-29', '2026-1', '26', '2026/11', '2026-00'])(
    'refuses %s',
    (date) => {
      expect(isActivityDate(date)).toBe(false);
    },
  );
});

describe('activitySchema', () => {
  it('stores an empty date as no date', () => {
    expect(activitySchema.parse({ ...activity, date: '  ' }).date).toBeNull();
  });
  it('names the field that is wrong', () => {
    const result = activitySchema.safeParse({ ...activity, date: '2026-13', title_ko: ' ' });
    const fields = result.error?.issues.map((issue) => [issue.path[0], issue.message]);
    expect(fields).toContainEqual(['date', 'invalidDate']);
    expect(fields).toContainEqual(['title_ko', 'required']);
  });
  it('needs a city in Korean but not in English', () => {
    expect(activitySchema.safeParse({ ...activity, city_ko: '' }).success).toBe(false);
    expect(activitySchema.safeParse({ ...activity, city_en: '' }).success).toBe(true);
  });
  it('takes an end date on or after the start, and only with a start', () => {
    const ok = (fields: Partial<typeof activity>) =>
      activitySchema.safeParse({ ...activity, ...fields }).success;
    expect(ok({ end_date: '2026-11-08' })).toBe(true);
    expect(ok({ end_date: '2026-11-06' })).toBe(true);
    expect(ok({ end_date: '2026-11-05' })).toBe(false);
    expect(ok({ date: '', end_date: '2026-11-08' })).toBe(false);
    const refused = activitySchema.safeParse({ ...activity, end_date: '2026-11-05' });
    expect(refused.success ? null : refused.error.issues[0]).toMatchObject({
      path: ['end_date'],
      message: 'endBeforeStart',
    });
  });
  it('keeps the body and the results within what the database takes', () => {
    expect(
      activitySchema.safeParse({ ...activity, body_ko: '가'.repeat(BOARD_LIMITS.body + 1) })
        .success,
    ).toBe(false);
    expect(
      activitySchema.safeParse({ ...activity, results_ko: '가'.repeat(BOARD_LIMITS.results + 1) })
        .success,
    ).toBe(false);
  });
  it('counts a summary the way the database does', () => {
    const summary = `${'가'.repeat(BOARD_LIMITS.summary - 1)}\r\n`;
    expect(activitySchema.safeParse({ ...activity, summary_ko: summary }).success).toBe(true);
    expect(
      activitySchema.safeParse({ ...activity, summary_ko: '가'.repeat(BOARD_LIMITS.summary + 1) })
        .success,
    ).toBe(false);
  });
});

describe('isUploadedPhoto', () => {
  it('tells an uploaded file from a photo that ships with the site', () => {
    expect(isUploadedPhoto('7e5c0000-0000-4000-8000-00000000b001.jpg')).toBe(true);
    expect(isUploadedPhoto('/images/activities/a.jpg')).toBe(false);
    expect(isUploadedPhoto(null)).toBe(false);
  });
});

describe('activityTimeline', () => {
  const row = {
    id: 'a',
    date: '2026-11',
    title_ko: '제목',
    title_en: '',
    city_ko: '서울',
    city_en: 'Seoul',
    is_planned: true,
  };
  it('runs oldest first with undated events last, and fills in missing English', () => {
    const events = activityTimeline([
      { ...row, id: 'undated', date: null },
      { ...row, id: 'new' },
      { ...row, id: 'old', date: '2025' },
    ]);
    expect(events.map((event) => event.id)).toEqual(['old', 'new', 'undated']);
    expect(events[0]).toMatchObject({
      title: { ko: '제목', en: '제목' },
      city: { ko: '서울', en: 'Seoul' },
      status: 'planned',
      evidence: [],
    });
    expect(events[0]).not.toHaveProperty('date', null);
  });
});

describe('readGallery', () => {
  const a = '7e5c0000-0000-4000-8000-00000000c001.jpg';
  const b = '7e5c0000-0000-4000-8000-00000000c002.webp';
  it('keeps uploaded files in their order', () => {
    expect(readGallery([b, a])).toEqual([b, a]);
    expect(readGallery([])).toEqual([]);
  });
  it('refuses anything a form would not send', () => {
    expect(readGallery(['/images/activities/a.jpg'])).toBeNull();
    expect(readGallery([a, a])).toBeNull();
    expect(readGallery([new File([], 'x')])).toBeNull();
    const many = Array.from(
      { length: BOARD_LIMITS.gallery + 1 },
      () => `${crypto.randomUUID()}.jpg`,
    );
    expect(readGallery(many)).toBeNull();
  });
});
