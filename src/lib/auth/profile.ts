import { z } from 'zod';
import type { Tables, TablesUpdate } from '@/lib/supabase/database.types';
import { NAME_MAX, OCCUPATIONS, TEXT_MAX, isStudent } from './occupation';

export type ProfileRow = Tables<'profiles'>;

// The columns a signed-in user may change on their own profile. The generated Update type lists
// every column; the database refuses the rest (email, recruit_opt_in, timestamps).
export type ProfileUpdate = Pick<
  TablesUpdate<'profiles'>,
  'last_name' | 'first_name' | 'occupation' | 'school' | 'major' | 'affiliation' | 'onboarded_at'
>;

// The list of occupations and the limits live in occupation.ts, which the sign-up form can load
// without this schema; they are re-exported here for everything that already imports them.
export { NAME_MAX, OCCUPATIONS, TEXT_MAX, isStudent };
export type { Occupation } from './occupation';

// Bumped whenever the privacy policy text changes. Stored with every consent record.
export const PRIVACY_POLICY_VERSION = '2026-10-27';

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
  .superRefine(
    (value, ctx) => {
      if (!isStudent(value.occupation)) return;
      for (const field of ['school', 'major'] as const) {
        if (value[field] === '') {
          ctx.addIssue({ code: 'custom', path: [field], message: 'required' });
        }
      }
    },
    // By default a check is skipped once another field has failed, which would hold back the
    // missing school or major until the other mistakes were fixed. The form shows every problem
    // at once, so this one runs regardless (a field that failed on its own is not empty text, and
    // is left out of this check).
    { when: () => true },
  )
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
