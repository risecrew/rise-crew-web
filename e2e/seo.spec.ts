import { expect, test } from '@playwright/test';

test('pages declare hreflang alternates and a canonical URL', async ({ page }) => {
  await page.goto('/en/about');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/en\/about$/);
  await expect(page.locator('link[rel="alternate"][hreflang="ko"]')).toHaveAttribute(
    'href',
    /\/ko\/about$/,
  );
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
    'href',
    /\/ko\/about$/,
  );
});

test('sitemap lists every page in both languages and robots points to it', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const path of ['/ko', '/en', '/ko/about', '/en/join'])
    expect(sitemap).toContain(`${path}</loc>`);
  expect(sitemap.match(/<url>/g)).toHaveLength(10);
  // The privacy policy is reachable but not listed until the accounts are launched.
  expect(sitemap).not.toContain('/privacy');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Sitemap:');
});

test('Open Graph image renders', async ({ request }) => {
  const response = await request.get('/ko/opengraph-image');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('image/png');
});

test('search engines stay out until the real domain is set', async ({ page, request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  // Crawlers must be allowed in to see the noindex; a Disallow would hide it from them.
  expect(robots).not.toMatch(/Disallow: \/\s/);
  await page.goto('/ko');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('the site icon is the RISE CREW symbol, not the framework default', async ({
  page,
  request,
}) => {
  await page.goto('/ko');
  const href = await page.locator('link[rel="icon"]').first().getAttribute('href');
  expect(href).toMatch(/icon/);
  const icon = await request.get(href!);
  expect(icon.status()).toBe(200);
  expect(await icon.text()).toContain('<svg');
  expect((await request.get('/favicon.ico')).status()).toBe(404);
});
