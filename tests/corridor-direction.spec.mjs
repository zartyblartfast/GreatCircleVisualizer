import { expect, test } from '@playwright/test';

test('corridor loading follows declared direction metadata', async ({ page }) => {
  const corridorRequests = [];
  page.on('request', (request) => {
    if (request.url().includes('/data/corridors/')) corridorRequests.push(request.url());
  });

  await page.goto('/index.html?diagnostics=1&corridorDirection=1', { waitUntil: 'networkidle' });
  await expect.poll(() => page.evaluate(() => window.__gcvDiagnostics?.mainMap?.().rendered ?? false), {
    timeout: 15_000,
    message: 'main map should render before corridor interaction'
  }).toBe(true);

  await page.locator('#SYD-SCL').click();
  await page.waitForTimeout(900);

  expect(corridorRequests.some((url) => url.endsWith('/SCL-SYD-v1.json'))).toBe(true);
  expect(corridorRequests.some((url) => url.endsWith('/SYD-SCL-v1.json'))).toBe(false);
});
