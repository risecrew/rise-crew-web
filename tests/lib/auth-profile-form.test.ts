import { describe, expect, it } from 'vitest';
import { parseProfileForm, readProfileForm } from '@/lib/auth/profile-form';
import { profileValues } from '@/lib/auth/profile-values';
import type { ProfileRow } from '@/lib/auth/profile';

// What a browser sends for the sign-up form: text fields as they were typed, a checked checkbox as
// "on", an unchecked one not at all, and fields that are not on the screen (school and major for an
// alumnus) not at all either.
function formOf(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return form;
}

const undergrad = {
  last_name: '박',
  first_name: '새롬',
  occupation: 'undergrad',
  school: '성균관대학교',
  major: '경영학',
  age14: 'on',
  privacy: 'on',
};

const alumnus = {
  last_name: '박',
  first_name: '새롬',
  occupation: 'alumni',
  age14: 'on',
  privacy: 'on',
};

// The same fields without some of them, as a checkbox that is not ticked is not in the post.
function without(fields: Record<string, string>, ...keys: string[]): Record<string, string> {
  return Object.fromEntries(Object.entries(fields).filter(([key]) => !keys.includes(key)));
}

function errorsOf(form: FormData, mode: 'welcome' | 'edit' = 'welcome') {
  const result = parseProfileForm(form, mode);
  return result.ok ? {} : result.fieldErrors;
}

describe('readProfileForm', () => {
  it('turns what is missing from the form into empty text and unticked boxes', () => {
    expect(readProfileForm(formOf({}))).toEqual({
      last_name: '',
      first_name: '',
      occupation: '',
      school: '',
      major: '',
      affiliation: '',
      age14: false,
      privacy: false,
      recruit: false,
    });
  });

  it('keeps text as it was typed (trimming is the schema job) and reads "on" as ticked', () => {
    const values = readProfileForm(formOf({ ...undergrad, last_name: ' 박 ', recruit: 'on' }));
    expect(values.last_name).toBe(' 박 ');
    expect(values).toMatchObject({ age14: true, privacy: true, recruit: true });
  });

  it('treats an uploaded file in a text field as nothing', () => {
    const form = new FormData();
    form.append('last_name', new File(['x'], 'x.txt'));
    expect(readProfileForm(form).last_name).toBe('');
  });

  it('reads only a box that says "on" as ticked', () => {
    expect(readProfileForm(formOf({ age14: 'true' })).age14).toBe(false);
    expect(readProfileForm(formOf({ age14: '' })).age14).toBe(false);
  });
});

describe('parseProfileForm', () => {
  it('accepts a student with everything filled in', () => {
    const result = parseProfileForm(formOf(undergrad), 'welcome');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        last_name: '박',
        first_name: '새롬',
        occupation: 'undergrad',
        school: '성균관대학교',
        major: '경영학',
        affiliation: null,
        recruit: false,
      });
    }
  });

  it('accepts an alumnus whose school and major are not in the form at all', () => {
    // FormData.get() returns null for these, which the schema would call "required".
    const form = formOf({ ...alumnus, affiliation: '라이즈 주식회사', recruit: 'on' });
    expect(form.get('school')).toBeNull();
    const result = parseProfileForm(form, 'welcome');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        occupation: 'alumni',
        school: null,
        major: null,
        affiliation: '라이즈 주식회사',
        recruit: true,
      });
    }
  });

  it('drops a school typed before switching to a non-student occupation', () => {
    const result = parseProfileForm(formOf({ ...alumnus, school: '성균관대학교' }), 'welcome');
    expect(result.ok && result.data.school).toBeNull();
  });

  it('names each missing answer', () => {
    expect(errorsOf(formOf({}))).toEqual({
      last_name: 'required',
      first_name: 'required',
      occupation: 'required',
      age14: 'consent_required',
      privacy: 'consent_required',
    });
  });

  it('asks a student for school and major, but not an alumnus', () => {
    expect(errorsOf(formOf({ ...undergrad, school: '', major: ' ' }))).toEqual({
      school: 'required',
      major: 'required',
    });
    expect(errorsOf(formOf(alumnus))).toEqual({});
  });

  it('names a missing major in the same round as the other mistakes', () => {
    // Zod skips a check once another field has failed; the form must not hold the major back
    // until the age box is ticked.
    expect(errorsOf(formOf(without(undergrad, 'major', 'age14')))).toEqual({
      major: 'required',
      age14: 'consent_required',
    });
    expect(errorsOf(formOf(without({ ...undergrad, last_name: '' }, 'school', 'privacy')))).toEqual(
      { last_name: 'required', school: 'required', privacy: 'consent_required' },
    );
  });

  it('refuses an occupation that is not one of the choices', () => {
    expect(errorsOf(formOf({ ...alumnus, occupation: 'wizard' }))).toEqual({
      occupation: 'required',
    });
  });

  it('refuses text over the limits', () => {
    expect(errorsOf(formOf({ ...undergrad, last_name: '가'.repeat(51) }))).toEqual({
      last_name: 'too_long',
    });
    expect(errorsOf(formOf({ ...undergrad, major: '가'.repeat(101) }))).toEqual({
      major: 'too_long',
    });
  });

  it('wants both age and privacy ticked when signing up', () => {
    expect(errorsOf(formOf({ ...undergrad, age14: '' }))).toEqual({ age14: 'consent_required' });
    expect(errorsOf(formOf(without(undergrad, 'privacy')))).toEqual({
      privacy: 'consent_required',
    });
  });

  it('does not ask for those two when editing: they were given at sign-up', () => {
    const result = parseProfileForm(formOf(without(undergrad, 'age14', 'privacy')), 'edit');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toMatchObject({ age14: true, privacy: true });
  });

  it('keeps one message per field and only the codes the form can show', () => {
    const errors = errorsOf(formOf({ ...undergrad, last_name: '', first_name: '' }));
    expect(errors).toEqual({ last_name: 'required', first_name: 'required' });
  });

  it('hands the values back as typed, so a failed form can be shown again', () => {
    const result = parseProfileForm(formOf({ ...undergrad, major: '', recruit: 'on' }), 'welcome');
    expect(result.ok).toBe(false);
    expect(result.values).toMatchObject({
      last_name: '박',
      occupation: 'undergrad',
      school: '성균관대학교',
      major: '',
      age14: true,
      recruit: true,
    });
  });

  it('ignores fields that are not part of the form', () => {
    // A crafted post may carry columns the user must not set; they never reach the result.
    const result = parseProfileForm(
      formOf({
        ...undergrad,
        recruit_opt_in: 'true',
        onboarded_at: '2000-01-01T00:00:00Z',
        id: 'someone-else',
      }),
      'welcome',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.data).sort()).toEqual(
        [
          'affiliation',
          'age14',
          'first_name',
          'last_name',
          'major',
          'occupation',
          'privacy',
          'recruit',
          'school',
        ].sort(),
      );
    }
  });
});

describe('profileValues', () => {
  const row: ProfileRow = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'someone@example.test',
    last_name: '박',
    first_name: '새롬',
    occupation: 'alumni',
    school: null,
    major: null,
    affiliation: '라이즈 주식회사',
    recruit_opt_in: true,
    onboarded_at: '2026-10-27T00:00:00Z',
    created_at: '2026-10-27T00:00:00Z',
    updated_at: '2026-10-27T00:00:00Z',
  };

  it('fills the form from a saved profile, with empty text for what is not set', () => {
    expect(profileValues(row)).toEqual({
      last_name: '박',
      first_name: '새롬',
      occupation: 'alumni',
      school: '',
      major: '',
      affiliation: '라이즈 주식회사',
      age14: true,
      privacy: true,
      recruit: true,
    });
  });

  it('is what an unfinished profile looks like too', () => {
    const empty = profileValues({
      ...row,
      last_name: null,
      first_name: null,
      occupation: null,
      affiliation: null,
      recruit_opt_in: false,
    });
    expect(empty).toMatchObject({ last_name: '', first_name: '', occupation: '', recruit: false });
  });
});
