type AuthEnv = Record<string, string | undefined>;

// Next inlines NEXT_PUBLIC_* values only where the source reads a literal `process.env.NAME`.
// Passing `process.env` itself would leave the browser bundle with an empty object, so the
// default is an object built from three literal reads.
const publicEnv: AuthEnv = {
  NEXT_PUBLIC_AUTH_ENABLED: process.env.NEXT_PUBLIC_AUTH_ENABLED,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};

// The site-wide switch for accounts and sign-in. It is on only when the flag is exactly "true"
// and the Supabase URL and publishable key are both present, so a half-configured environment
// (or a plain `pnpm build` with no Supabase variables) behaves as if accounts do not exist.
export function isAuthEnabled(env: AuthEnv = publicEnv): boolean {
  return (
    env.NEXT_PUBLIC_AUTH_ENABLED === 'true' &&
    Boolean(env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  );
}
