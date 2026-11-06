// The same rule the Auth settings enforce (minimum_password_length and password_requirements in
// supabase/config.toml, and the dashboard of each project). Checking here only gives the message
// sooner; Auth has the last word.
export const PASSWORD_MIN_LENGTH = 8;
// bcrypt, which Auth hashes with, reads no further than this many bytes, and Auth refuses a longer
// password.
const PASSWORD_MAX_BYTES = 72;

export type PasswordProblem = 'invalid' | 'tooLong';

export function passwordProblem(password: string): PasswordProblem | null {
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) return 'tooLong';
  if (Array.from(password).length < PASSWORD_MIN_LENGTH) return 'invalid';
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return 'invalid';
  return null;
}
