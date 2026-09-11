import { expect, test } from '@playwright/test';

test('main controls use the current route and map labels', async ({ page }) => {
  await page.goto('/index.html?uiLabels=1', { waitUntil: 'networkidle' });

  await expect(page.locator('#suggestions-button')).toContainText('Example Routes');
  await expect(page.locator('#make-maps-button')).toContainText('Update Map');
  await expect(page.locator('#suggestions-button')).not.toContainText('Suggestions');
  await expect(page.locator('#make-maps-button')).not.toContainText('Update Flight Paths');
});
