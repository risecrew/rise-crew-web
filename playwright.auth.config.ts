import { execSync } from 'node:child_process';
import { defineConfig, devices } from '@playwright/test';

// The accounts e2e: the site is built with the accounts switch on, into its own folder
// (.next-auth), and talks to the local Supabase stack. The default config (playwright.config.ts)
// keeps testing the site with the switch off.

const PORT = 3200;

// The local stack's address and publishable key come from `supabase status`, at the moment the
// config loads, so no key is ever written to a file. The values are handed to the test workers
// through the environment (a worker loads this config again and finds them already there).
function readLocalSupabase(): { url: string; publishableKey: string } {
  if (!process.env.E2E_SUPABASE_URL || !process.env.E2E_SUPABASE_PUBLISHABLE_KEY) {
    let output: string;
    try {
      output = execSync('pnpm exec supabase status -o env', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch {
      throw new Error(
        'The accounts e2e needs the local Supabase stack, and it is not running. ' +
          'Start it with `pnpm db:start`, then run `pnpm e2e:auth` again.',
      );
    }
    const values = new Map<string, string>();
    for (const line of output.split('\n')) {
      const match = /^([A-Z0-9_]+)="?(.*?)"?$/.exec(line.trim());
      if (match) values.set(match[1], match[2]);
    }
    const url = values.get('API_URL');
    const publishableKey = values.get('PUBLISHABLE_KEY');
    if (!url || !publishableKey) {
      throw new Error('`supabase status -o env` did not list API_URL and PUBLISHABLE_KEY.');
    }
    process.env.E2E_SUPABASE_URL = url;
    process.env.E2E_SUPABASE_PUBLISHABLE_KEY = publishableKey;
    // The tests use it to set up and clean up accounts and to check what the database holds. The
    // site is given it too (see webServer below), because deleting an account needs it.
    process.env.E2E_SUPABASE_SECRET_KEY = values.get('SECRET_KEY') ?? '';
  }

  const url = process.env.E2E_SUPABASE_URL;
  // The tests sign in as the seeded example accounts and create new ones, so they only run
  // against the local stack, never against a real project.
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(url)) {
    throw new Error(`The accounts e2e only runs against the local stack, not ${url}.`);
  }
  return { url, publishableKey: process.env.E2E_SUPABASE_PUBLISHABLE_KEY };
}

const supabase = readLocalSupabase();

export default defineConfig({
  testDir: 'e2e/auth',
  // Every test signs in as the same few seeded accounts, and a new sign-in link replaces the
  // previous one for that account, so the tests run one after another.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/ko`,
    reuseExistingServer: !process.env.CI,
    // The build is part of the command, so the first start takes a while.
    timeout: 300_000,
    env: {
      NEXT_DIST_DIR: '.next-auth',
      NEXT_PUBLIC_AUTH_ENABLED: 'true',
      NEXT_PUBLIC_SUPABASE_URL: supabase.url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabase.publishableKey,
      // Server only (no NEXT_PUBLIC_ prefix): the site deletes an account with it. The local
      // stack's key, so it can only ever act on the local stack.
      SUPABASE_SECRET_KEY: process.env.E2E_SUPABASE_SECRET_KEY ?? '',
    },
  },
});
