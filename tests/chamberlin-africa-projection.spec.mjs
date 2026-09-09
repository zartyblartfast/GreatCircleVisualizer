import { expect, test } from '@playwright/test';

test('Chamberlin Africa uses its configured no-clipping zoom level', async ({ page }) => {
  await page.goto('/index.html?diagnostics=1', { waitUntil: 'networkidle' });
  await expect.poll(() => page.evaluate(() => window.__gcvDiagnostics?.mainMap?.().rendered ?? false), { timeout: 15_000 }).toBe(true);

  await page.evaluate(() => {
    const select = document.getElementById('projectionSelect');
    select.value = 'geoChamberlinAfrica';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(800);
  await page.locator('#chartdiv1').screenshot({ path: 'test-results/chamberlin-africa-zoomed.png' });

  expect((await page.evaluate(() => window.__gcvDiagnostics.mainMap())).zoomLevel).toBe(0.9);
});
