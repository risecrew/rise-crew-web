import { describe, expect, it, vi } from 'vitest';
import {
  activitySchema,
  BOARD_LIMITS,
  cleanFileName,
  isActivityDate,
  noticeFileContentType,
  noticeFileProblem,
  noticeSchema,
  readAttachments,
} from '@/lib/board/forms';
import {
  activityTimeline,
  formatFileSize,
  isUploadedPhoto,
  localized,
  noticeFileDownload,
  showsFallback,
} from '@/lib/board/text';

const activity = {
  date: '2026-11-06',
  title_ko: '행사',
  title_en: '',
  city_ko: '서울',
  city_en: '',
  summary_ko: '',
  summary_en: '',
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
  it('counts a summary the way the database does', () => {
    const summary = `${'가'.repeat(BOARD_LIMITS.summary - 1)}\r\n`;
    expect(activitySchema.safeParse({ ...activity, summary_ko: summary }).success).toBe(true);
    expect(
      activitySchema.safeParse({ ...activity, summary_ko: '가'.repeat(BOARD_LIMITS.summary + 1) })
        .success,
    ).toBe(false);
  });
});

describe('noticeSchema', () => {
  const notice = { title_ko: '공지', title_en: '', body_ko: '본문', body_en: '', is_pinned: true };
  it('needs a Korean title and body', () => {
    expect(noticeSchema.safeParse(notice).success).toBe(true);
    expect(noticeSchema.safeParse({ ...notice, body_ko: ' ' }).success).toBe(false);
  });
  it('counts a line break as one character', () => {
    const body = `${'가'.repeat(BOARD_LIMITS.noticeBody - 2)}\r\n가`;
    expect(noticeSchema.safeParse({ ...notice, body_ko: body }).success).toBe(true);
  });
  it('refuses a body over the limit', () => {
    const body = '가'.repeat(BOARD_LIMITS.noticeBody + 1);
    expect(noticeSchema.safeParse({ ...notice, body_ko: body }).error?.issues[0]?.message).toBe(
      'tooLong',
    );
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

describe('notice attachments', () => {
  it('knows a file by its ending, whatever the browser calls it', () => {
    expect(noticeFileProblem({ name: '모집 안내.HWP', size: 100 })).toBeNull();
    expect(noticeFileProblem({ name: '지원서.docx', size: 100 })).toBeNull();
    expect(noticeFileContentType('지원서.hwp')).toBe('application/x-hwp');
  });
  it('refuses a page, a program or an archive, even under a double ending', () => {
    for (const name of ['a.html', 'a.svg', 'a.exe', 'a.zip', 'a.pdf.html', 'noending']) {
      expect(noticeFileProblem({ name, size: 100 })).toBe('badType');
    }
  });
  it('refuses a file over the limit', () => {
    expect(noticeFileProblem({ name: 'a.pdf', size: BOARD_LIMITS.noticeFileBytes + 1 })).toBe(
      'tooLarge',
    );
  });
  it('reads attachments back, and an unreadable value as none', () => {
    const file = { path: '7e5c0000-0000-4000-8000-00000000b001.pdf', name: '안내.pdf', size: 10 };
    expect(readAttachments([file])).toEqual([file]);
    expect(readAttachments('nonsense')).toEqual([]);
    expect(readAttachments([{ path: 'https://example.test/a.pdf', name: 'a', size: 1 }])).toEqual(
      [],
    );
  });
  it('keeps a long file name to the limit with its ending, and without folders', () => {
    const name = cleanFileName(`../${'가'.repeat(300)}.pdf`);
    expect(name.length).toBeLessThanOrEqual(BOARD_LIMITS.noticeFileName);
    expect(name.endsWith('.pdf')).toBe(true);
    expect(name).not.toContain('/');
  });
  it('makes a download address that keeps a Korean file name', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'key');
    const url = noticeFileDownload({
      path: '7e5c0000-0000-4000-8000-00000000b001.pdf',
      name: '모집 안내.pdf',
      size: 1,
    });
    expect(url).toContain('/notice-files/7e5c0000-0000-4000-8000-00000000b001.pdf?download=');
    expect(url).toContain(encodeURIComponent('모집 안내.pdf'));
    vi.unstubAllEnvs();
  });
  it('says a size in the unit a person would', () => {
    expect(formatFileSize(900)).toBe('1 KB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });
});
