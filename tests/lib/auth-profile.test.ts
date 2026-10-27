import { describe, expect, it } from 'vitest';
import { PRIVACY_POLICY_VERSION, displayName, initial, profileSchema } from '@/lib/auth/profile';

const undergrad = {
  last_name: '김',
  first_name: '라이즈',
  occupation: 'undergrad',
  school: '성균관대학교',
  major: '경영학',
  affiliation: '',
  age14: true,
  privacy: true,
  recruit: false,
};

function without<T extends object, K extends keyof T>(value: T, key: K): Omit<T, K> {
  const copy = { ...value };
  delete copy[key];
  return copy;
}

function failedPaths(input: unknown): string[] {
  const result = profileSchema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((issue) => issue.path.join('.'));
}

describe('profileSchema', () => {
  it('accepts a valid undergraduate', () => {
    const result = profileSchema.safeParse(undergrad);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        last_name: '김',
        first_name: '라이즈',
        occupation: 'undergrad',
        school: '성균관대학교',
        major: '경영학',
        affiliation: null,
        recruit: false,
      });
    }
  });

  it('requires a major for a graduate student', () => {
    const input = { ...undergrad, occupation: 'grad', major: '' };
    expect(failedPaths(input)).toContain('major');
    expect(failedPaths({ ...input, major: '   ' })).toContain('major');
  });

  it('requires a school for a student', () => {
    expect(failedPaths({ ...undergrad, school: '' })).toContain('school');
  });

  it('accepts an alumni with an empty affiliation and no school or major', () => {
    const result = profileSchema.safeParse({
      ...undergrad,
      occupation: 'alumni',
      school: '',
      major: '',
      affiliation: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.school).toBeNull();
      expect(result.data.major).toBeNull();
      expect(result.data.affiliation).toBeNull();
    }
  });

  it('keeps only the fields that belong to the chosen occupation', () => {
    const student = profileSchema.safeParse({ ...undergrad, affiliation: 'Old company' });
    expect(student.success && student.data.affiliation).toBeNull();

    const founder = profileSchema.safeParse({
      ...undergrad,
      occupation: 'founder',
      affiliation: 'RISE Labs',
    });
    expect(founder.success).toBe(true);
    if (founder.success) {
      expect(founder.data.school).toBeNull();
      expect(founder.data.major).toBeNull();
      expect(founder.data.affiliation).toBe('RISE Labs');
    }
  });

  it('rejects an occupation outside the list', () => {
    expect(failedPaths({ ...undergrad, occupation: 'student' })).toContain('occupation');
    expect(failedPaths({ ...undergrad, occupation: undefined })).toContain('occupation');
  });

  it('requires the age and privacy consents', () => {
    expect(failedPaths({ ...undergrad, age14: false })).toContain('age14');
    expect(failedPaths({ ...undergrad, privacy: false })).toContain('privacy');
    expect(failedPaths(without(undergrad, 'age14'))).toContain('age14');
    expect(failedPaths(without(undergrad, 'privacy'))).toContain('privacy');
  });

  it('treats the recruitment consent as optional and off by default', () => {
    const result = profileSchema.safeParse(without(undergrad, 'recruit'));
    expect(result.success && result.data.recruit).toBe(false);
    const optedIn = profileSchema.safeParse({ ...undergrad, recruit: true });
    expect(optedIn.success && optedIn.data.recruit).toBe(true);
  });

  it('rejects names and free text over their length limits', () => {
    expect(failedPaths({ ...undergrad, last_name: '김'.repeat(51) })).toContain('last_name');
    expect(failedPaths({ ...undergrad, first_name: 'a'.repeat(51) })).toContain('first_name');
    expect(failedPaths({ ...undergrad, school: 's'.repeat(101) })).toContain('school');
    expect(failedPaths({ ...undergrad, major: 'm'.repeat(101) })).toContain('major');
    expect(
      failedPaths({ ...undergrad, occupation: 'other', affiliation: 'a'.repeat(101) }),
    ).toContain('affiliation');
    expect(profileSchema.safeParse({ ...undergrad, first_name: 'a'.repeat(50) }).success).toBe(
      true,
    );
  });

  it('rejects empty names', () => {
    expect(failedPaths({ ...undergrad, last_name: '   ' })).toContain('last_name');
    expect(failedPaths({ ...undergrad, first_name: '' })).toContain('first_name');
  });

  it('trims surrounding whitespace', () => {
    const result = profileSchema.safeParse({
      ...undergrad,
      last_name: '  김 ',
      first_name: ' 라이즈  ',
      school: ' 성균관대학교 ',
      major: '\t경영학\n',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.last_name).toBe('김');
      expect(result.data.first_name).toBe('라이즈');
      expect(result.data.school).toBe('성균관대학교');
      expect(result.data.major).toBe('경영학');
    }
  });
});

describe('PRIVACY_POLICY_VERSION', () => {
  it('is the version of the published privacy policy', () => {
    expect(PRIVACY_POLICY_VERSION).toBe('2026-10-27');
  });
});

describe('displayName', () => {
  const person = { last_name: '김', first_name: '라이즈' };

  it('puts the family name first without a space in Korean', () => {
    expect(displayName(person, 'ko')).toBe('김라이즈');
  });

  it('puts the given name first with a space in English', () => {
    expect(displayName(person, 'en')).toBe('라이즈 김');
    expect(displayName({ last_name: 'Kim', first_name: 'Rise' }, 'en')).toBe('Rise Kim');
  });

  it('copes with a profile that has no name yet', () => {
    expect(displayName({ last_name: null, first_name: null }, 'ko')).toBe('');
    expect(displayName({ last_name: null, first_name: null }, 'en')).toBe('');
    expect(displayName({ last_name: null, first_name: 'Rise' }, 'en')).toBe('Rise');
  });
});

describe('initial', () => {
  it('is the first character of the Korean display name', () => {
    expect(initial({ last_name: '김', first_name: '라이즈' })).toBe('김');
  });

  it('is the first letter of the given name for a Latin name', () => {
    expect(initial({ last_name: 'Kim', first_name: 'rise' })).toBe('R');
  });

  it('keeps a whole grapheme and handles an empty name', () => {
    expect(initial({ last_name: '👩‍💻', first_name: '라이즈' })).toBe('👩‍💻');
    expect(initial({ last_name: null, first_name: null })).toBe('');
  });
});
