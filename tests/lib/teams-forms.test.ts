import { describe, expect, it } from 'vitest';
import {
  TEAM_LIMITS,
  checkPhoto,
  isPhotoPathFor,
  makeTeamSlug,
  postSchema,
  teamCreateSchema,
  teamIntroSchema,
  teamSettingsSchema,
} from '@/lib/teams/forms';

const TEAM = '7e590000-0000-4000-8000-000000000a01';
const POST = '7e590000-0000-4000-8000-000000000d01';
const FILE = '7e590000-0000-4000-8000-000000000010';
const MB = 1024 * 1024;

describe('TEAM_LIMITS', () => {
  it('holds the numbers from the spec', () => {
    expect(TEAM_LIMITS).toEqual({
      name: 50,
      tagline: 80,
      intro: 2000,
      postTitle: 100,
      postBody: 5000,
      links: 5,
      photos: 4,
      photoBytes: 5 * MB,
      logoBytes: 2 * MB,
      coverBytes: 5 * MB,
      inputBytes: 30 * MB,
      pageSize: 10,
    });
  });
});

describe('teamIntroSchema', () => {
  const ok = { tagline: '한 줄', intro: '소개', links: [] };

  it('accepts a good intro and trims', () => {
    expect(
      teamIntroSchema.parse({
        ...ok,
        tagline: ' 한 줄 ',
        links: [{ kind: 'homepage', url: 'https://a.example.test' }],
      }),
    ).toEqual({
      tagline: '한 줄',
      intro: '소개',
      links: [{ kind: 'homepage', url: 'https://a.example.test' }],
    });
  });
  it('refuses a javascript: link', () => {
    const links = [{ kind: 'other', url: 'javascript:alert(1)' }];
    expect(teamIntroSchema.safeParse({ ...ok, links }).success).toBe(false);
  });
  it('refuses an address with a space, which the database also refuses', () => {
    const links = [{ kind: 'other', url: 'https://a.test/b c' }];
    expect(teamIntroSchema.safeParse({ ...ok, links }).success).toBe(false);
  });
  it('refuses an unknown kind', () => {
    const links = [{ kind: 'blog', url: 'https://a.example.test' }];
    expect(teamIntroSchema.safeParse({ ...ok, links }).success).toBe(false);
  });
  it('refuses a sixth link', () => {
    const links = Array.from({ length: 6 }, (_, i) => ({
      kind: 'other',
      url: `https://a.example.test/${i}`,
    }));
    expect(teamIntroSchema.safeParse({ ...ok, links }).success).toBe(false);
  });
  it('refuses an 81-character tagline and a 2,001-character intro', () => {
    expect(teamIntroSchema.safeParse({ ...ok, tagline: '가'.repeat(81) }).success).toBe(false);
    expect(teamIntroSchema.safeParse({ ...ok, tagline: '가'.repeat(80) }).success).toBe(true);
    expect(teamIntroSchema.safeParse({ ...ok, intro: '가'.repeat(2001) }).success).toBe(false);
  });
});

describe('postSchema', () => {
  const ok = { title: '제목', body: '본문', visibility: 'public' };

  it('accepts a good post', () => {
    expect(postSchema.parse(ok)).toEqual(ok);
  });
  it('accepts an empty body, because a photo post needs no words', () => {
    expect(postSchema.safeParse({ ...ok, body: '' }).success).toBe(true);
  });
  it('refuses a blank title', () => {
    expect(postSchema.safeParse({ ...ok, title: '   ' }).success).toBe(false);
  });
  it('refuses a 101-character title', () => {
    expect(postSchema.safeParse({ ...ok, title: '가'.repeat(101) }).success).toBe(false);
  });
  it('refuses a 5,001-character body', () => {
    expect(postSchema.safeParse({ ...ok, body: '가'.repeat(5001) }).success).toBe(false);
  });
  it('refuses an unknown visibility', () => {
    expect(postSchema.safeParse({ ...ok, visibility: 'friends' }).success).toBe(false);
  });
  it('counts a line break in a form as one character', () => {
    const body = `${'가'.repeat(2500)}\r\n${'나'.repeat(2499)}`;
    expect(postSchema.parse({ ...ok, body }).body).toBe(
      `${'가'.repeat(2500)}\n${'나'.repeat(2499)}`,
    );
  });
});

describe('teamCreateSchema and teamSettingsSchema', () => {
  const ok = { name: '라이즈', cohort: '3' };

  it('accepts a good team and reads the cohort as a number', () => {
    expect(teamCreateSchema.parse(ok)).toEqual({ ...ok, cohort: 3 });
  });
  it('drops a field sent by an old form (teams have none any more)', () => {
    expect(teamCreateSchema.parse({ ...ok, field: 'mobility' })).toEqual({ ...ok, cohort: 3 });
  });
  it('refuses cohort 0 and a 51-character name', () => {
    expect(teamCreateSchema.safeParse({ ...ok, cohort: '0' }).success).toBe(false);
    expect(teamCreateSchema.safeParse({ ...ok, cohort: 'abc' }).success).toBe(false);
    expect(teamCreateSchema.safeParse({ ...ok, name: '가'.repeat(51) }).success).toBe(false);
  });
  it('settings adds the publish switch', () => {
    expect(teamSettingsSchema.parse({ ...ok, is_published: 'on' }).is_published).toBe(true);
    expect(teamSettingsSchema.parse(ok).is_published).toBe(false);
  });
  it('settings cannot carry an address', () => {
    expect(teamSettingsSchema.parse({ ...ok, slug: 'other-address' })).not.toHaveProperty('slug');
  });
});

describe('makeTeamSlug', () => {
  const DATABASE_RULE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  it('uses the letters of an English name', () => {
    expect(makeTeamSlug('Popvia', 'abc123')).toBe('popvia-abc123');
    expect(makeTeamSlug('Yureka Publishing!', 'abc123')).toBe('yureka-publishing-abc123');
  });
  it('falls back to team for a Korean name', () => {
    expect(makeTeamSlug('느린단맛연구소', 'abc123')).toBe('team-abc123');
  });
  it('keeps the English part of a mixed name', () => {
    expect(makeTeamSlug('AI 곁은', 'abc123')).toBe('ai-abc123');
  });
  it('always passes the database rule and stays short', () => {
    for (const name of ['--', ' a  b ', 'É!', 'x'.repeat(50), `${'a-'.repeat(25)}`]) {
      const slug = makeTeamSlug(name, 'abc123');
      expect(slug).toMatch(DATABASE_RULE);
      expect(slug.length).toBeLessThanOrEqual(60);
    }
  });
  it('makes a different address each time without being told the ending', () => {
    expect(makeTeamSlug('같은 이름')).not.toBe(makeTeamSlug('같은 이름'));
  });
});

describe('checkPhoto', () => {
  it('takes the three image types up to the limit', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(checkPhoto({ size: 5 * MB, type }, 5 * MB)).toBe('ok');
    }
  });
  it('refuses one byte over', () => {
    expect(checkPhoto({ size: 5 * MB + 1, type: 'image/png' }, 5 * MB)).toBe('tooLarge');
  });
  it('refuses SVG', () => {
    expect(checkPhoto({ size: 10, type: 'image/svg+xml' }, 5 * MB)).toBe('badType');
  });
});

describe('isPhotoPathFor', () => {
  it('accepts a file in the post folder', () => {
    expect(isPhotoPathFor(`${TEAM}/${POST}/${FILE}.png`, TEAM, POST)).toBe(true);
  });
  it('refuses another post, another team and traversal', () => {
    const other = '7e590000-0000-4000-8000-000000000d02';
    expect(isPhotoPathFor(`${TEAM}/${other}/${FILE}.png`, TEAM, POST)).toBe(false);
    expect(isPhotoPathFor(`${other}/${POST}/${FILE}.png`, TEAM, POST)).toBe(false);
    expect(isPhotoPathFor(`${TEAM}/${POST}/../${FILE}.png`, TEAM, POST)).toBe(false);
    expect(isPhotoPathFor(`${TEAM}/${POST}/..`, TEAM, POST)).toBe(false);
  });
  it('refuses a file type the bucket does not take', () => {
    expect(isPhotoPathFor(`${TEAM}/${POST}/${FILE}.svg`, TEAM, POST)).toBe(false);
  });
});
