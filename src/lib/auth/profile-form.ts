import { profileSchema, type ProfileFormData } from './profile';
import {
  EMPTY_PROFILE_VALUES,
  type FieldErrors,
  type ProfileFormInvalid,
  type ProfileFormValues,
} from './profile-values';

const TEXT_FIELDS = [
  'last_name',
  'first_name',
  'occupation',
  'school',
  'major',
  'affiliation',
] as const;
const BOXES = ['age14', 'privacy', 'recruit'] as const;

// FormData.get() gives null for a field that is not in the form (school and major are not on the
// screen for an alumnus) and a File when someone posts one; both count as empty text. A checkbox
// is in the form only when it is ticked, as "on".
export function readProfileForm(form: FormData): ProfileFormValues {
  const values = { ...EMPTY_PROFILE_VALUES };
  for (const field of TEXT_FIELDS) {
    const value = form.get(field);
    values[field] = typeof value === 'string' ? value : '';
  }
  for (const box of BOXES) values[box] = form.get(box) === 'on';
  return values;
}

export type ProfileFormParsed =
  { ok: true; data: ProfileFormData; values: ProfileFormValues } | ProfileFormInvalid;

const CODES = new Set(['required', 'too_long', 'consent_required']);

// Checks the form against the sign-up schema. When editing, the two sign-up consents are not on
// the form (they were given once, at sign-up), so they count as given.
export function parseProfileForm(form: FormData, mode: 'welcome' | 'edit'): ProfileFormParsed {
  const values = readProfileForm(form);
  const input = mode === 'edit' ? { ...values, age14: true, privacy: true } : values;

  const result = profileSchema.safeParse(input);
  if (result.success) return { ok: true, data: result.data, values };

  const fieldErrors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? 'form');
    // One message per field: the first one the schema found.
    if (field in fieldErrors) continue;
    fieldErrors[field] = CODES.has(issue.message) ? issue.message : 'required';
  }
  return { ok: false, fieldErrors, values };
}
