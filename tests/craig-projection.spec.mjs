import { expect, test } from '@playwright/test';

test('Craig uses its configured no-clipping zoom level', async ({ page }) => {
  await page.goto('/index.html?diagnostics=1', { waitUntil: 'networkidle' });
  await expect.poll(() => page.evaluate(() => window.__gcvDiagnostics?.mainMap?.().rendered ?? false), { timeout: 15_000 }).toBe(true);

  await page.evaluate(() => {
    const select = document.getElementById('projectionSelect');
    select.value = 'geoCraig';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(800);

  const state = await page.evaluate(() => window.__gcvDiagnostics.mainMap());
  expect(state.zoomLevel).toBe(0.9);
});
