type Env = Record<string, string | undefined>;

export function getSiteUrl(env: Env = process.env): URL {
  if (env.NEXT_PUBLIC_SITE_URL) return new URL(env.NEXT_PUBLIC_SITE_URL);
  if (env.VERCEL_PROJECT_PRODUCTION_URL)
    return new URL(`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`);
  return new URL('http://localhost:3000');
}

// The *.vercel.app address is temporary. Search engines are kept out until the real domain
// is configured as NEXT_PUBLIC_SITE_URL, so the temporary address never gets indexed.
export function isLaunched(env: Env = process.env): boolean {
  if (!env.NEXT_PUBLIC_SITE_URL) return false;
  const host = new URL(env.NEXT_PUBLIC_SITE_URL).hostname;
  return host !== 'localhost' && !host.endsWith('.vercel.app');
}
