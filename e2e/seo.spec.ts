import { expect, test } from '@playwright/test';

test('pages declare hreflang alternates and a canonical URL', async ({ page }) => {
  await page.goto('/en/about');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/en\/about$/);
  await expect(page.locator('link[rel="alternate"][hreflang="ko"]')).toHaveAttribute('href', /\/ko\/about$/);
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute('href', /\/ko\/about$/);
});

test('sitemap lists every page in both languages and robots points to it', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const path of ['/ko', '/en', '/ko/about', '/en/join']) expect(sitemap).toContain(`${path}</loc>`);
  expect(sitemap.match(/<url>/g)).toHaveLength(10);
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Sitemap:');
});

test('Open Graph image renders', async ({ request }) => {
  const response = await request.get('/ko/opengraph-image');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('image/png');
});
