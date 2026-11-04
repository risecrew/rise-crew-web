import type { ProfileRow } from './profile';

// What the sign-up and edit form holds. This module has no runtime imports, so the form in the
// browser can use it without loading the schema (and zod with it); parsing is in profile-form.ts.

// As the browser sends the form back: text as typed, boxes as ticked or not. An occupation is a
// string here because the browser may send anything.
export type ProfileFormValues = {
  last_name: string;
  first_name: string;
  occupation: string;
  school: string;
  major: string;
  affiliation: string;
  age14: boolean;
  privacy: boolean;
  recruit: boolean;
};

export const EMPTY_PROFILE_VALUES: ProfileFormValues = {
  last_name: '',
  first_name: '',
  occupation: '',
  school: '',
  major: '',
  affiliation: '',
  age14: false,
  privacy: false,
  recruit: false,
};

// The form fields of an account's profile, for showing a form that is already filled in.
export function profileValues(profile: ProfileRow): ProfileFormValues {
  return {
    last_name: profile.last_name ?? '',
    first_name: profile.first_name ?? '',
    occupation: profile.occupation ?? '',
    school: profile.school ?? '',
    major: profile.major ?? '',
    affiliation: profile.affiliation ?? '',
    // Given once, at sign-up; an edit never asks for them again.
    age14: true,
    privacy: true,
    recruit: profile.recruit_opt_in,
  };
}

// A message for the form to show next to a field, by field name. The values are the schema's
// codes (see profile.ts), or `form` for a problem with the whole form.
export type FieldErrors = Record<string, string>;

export type ProfileFormInvalid = { ok: false; fieldErrors: FieldErrors; values: ProfileFormValues };

// What a refused submit sends back to the form. `at` tells one attempt from the next, so the form
// can announce the same refusal again. A saved form sends nothing back: the visitor is redirected.
export type ProfileFormFailure = ProfileFormInvalid & { at: number };
export type ProfileFormState = ProfileFormFailure | null;
