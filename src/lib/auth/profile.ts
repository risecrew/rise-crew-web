import { z } from 'zod';
import type { Tables, TablesUpdate } from '@/lib/supabase/database.types';

export type ProfileRow = Tables<'profiles'>;

// The columns a signed-in user may change on their own profile. The generated Update type lists
// every column; the database refuses the rest (email, recruit_opt_in, timestamps).
export type ProfileUpdate = Pick<
  TablesUpdate<'profiles'>,
  'last_name' | 'first_name' | 'occupation' | 'school' | 'major' | 'affiliation' | 'onboarded_at'
>;

export const OCCUPATIONS = ['undergrad', 'grad', 'alumni', 'founder', 'other'] as const;
export type Occupation = (typeof OCCUPATIONS)[number];

const STUDENT_OCCUPATIONS: readonly Occupation[] = ['undergrad', 'grad'];

// School and major are asked of students; everyone else may give an affiliation.
export function isStudent(occupation: Occupation): boolean {
  return STUDENT_OCCUPATIONS.includes(occupation);
}

// Bumped whenever the privacy policy text changes. Stored with every consent record.
export const PRIVACY_POLICY_VERSION = '2026-10-27';

const NAME_MAX = 50;
const TEXT_MAX = 100;

// Messages are codes, not sentences, so the form can show them in either language:
//   required          the field is empty (or, for an occupation, not one of the options)
//   too_long          over the length limit
//   consent_required  a required checkbox is not ticked
const name = z
  .string({ error: 'required' })
  .trim()
  .min(1, { error: 'required' })
  .max(NAME_MAX, { error: 'too_long' });

const freeText = z
  .string({ error: 'required' })
  .trim()
  .max(TEXT_MAX, { error: 'too_long' })
  .default('');

const mustAgree = z.literal(true, { error: 'consent_required' });

// The sign-up form (spec §6). Keys follow the database columns; the three consents are named
// after the `consents.kind` values they become. Checkboxes must arrive as booleans, so the form
// action converts FormData before parsing. The result holds what is worth saving: text fields
// that do not apply to the chosen occupation, and empty ones, come out as null.
export const profileSchema = z
  .object({
    last_name: name,
    first_name: name,
    occupation: z.enum(OCCUPATIONS, { error: 'required' }),
    school: freeText,
    major: freeText,
    affiliation: freeText,
    age14: mustAgree,
    privacy: mustAgree,
    recruit: z.boolean({ error: 'required' }).default(false),
  })
  .superRefine((value, ctx) => {
    if (!isStudent(value.occupation)) return;
    for (const field of ['school', 'major'] as const) {
      if (value[field] === '') {
        ctx.addIssue({ code: 'custom', path: [field], message: 'required' });
      }
    }
  })
  .transform((value) => {
    const student = isStudent(value.occupation);
    return {
      ...value,
      school: student && value.school !== '' ? value.school : null,
      major: student && value.major !== '' ? value.major : null,
      affiliation: !student && value.affiliation !== '' ? value.affiliation : null,
    };
  });

export type ProfileFormInput = z.input<typeof profileSchema>;
export type ProfileFormData = z.output<typeof profileSchema>;

// Kept in their own module (name.ts) so the header can use them without pulling this file's form
// schema into every page; they are re-exported here for the screens that already import them.
export { displayName, initial } from './name';
