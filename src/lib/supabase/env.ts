// The Supabase address and publishable key, with a clear error when they are missing. Next only
// inlines NEXT_PUBLIC_* values into the browser bundle where the source reads a literal
// `process.env.NAME`, so each variable is read by name here.
export function getSupabasePublicConfig(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      'Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  return { url, publishableKey };
}
