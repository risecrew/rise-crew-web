// What a member does now, and the limits on what they type about it. The sign-up form (in the
// browser) and the schema that checks it (on the server) read the same list, which is why this
// lives apart from profile.ts: the form must not pull the schema, and zod with it, into its bundle.

export const OCCUPATIONS = ['undergrad', 'grad', 'alumni', 'founder', 'other'] as const;
export type Occupation = (typeof OCCUPATIONS)[number];

const STUDENT_OCCUPATIONS: readonly Occupation[] = ['undergrad', 'grad'];

// School and major are asked of students; everyone else may give an affiliation.
export function isStudent(occupation: Occupation): boolean {
  return STUDENT_OCCUPATIONS.includes(occupation);
}

// The database holds the same limits (profiles_*_length).
export const NAME_MAX = 50;
export const TEXT_MAX = 100;
