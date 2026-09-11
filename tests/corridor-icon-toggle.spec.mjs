import { expect, test } from '@playwright/test';

test('flight corridor icons toggle independently from tag expansion', async ({ page }) => {
  await page.goto('/index.html?diagnostics=1&corridorIconToggle=1', { waitUntil: 'networkidle' });
  await expect.poll(() => page.evaluate(() => window.__gcvDiagnostics?.mainMap?.().rendered ?? false), {
    timeout: 15_000,
    message: 'main map should render before corridor icon interaction'
  }).toBe(true);

  await page.evaluate(() => {
    window.__corridorToggleEvents = [];
    document.addEventListener('corridorVisibilityToggle', (event) => {
      window.__corridorToggleEvents.push(event.detail);
    });
  });

  const availableTag = page.locator('#PER-LHR');
  const availableIcon = availableTag.locator('.corridor-toggleable');
  const otherAvailableIcon = page.locator('#LAX-DXB .corridor-toggleable');
  await expect(availableIcon).toHaveAttribute('data-corridor-visible', 'true');
  await expect(otherAvailableIcon).toHaveAttribute('data-corridor-visible', 'true');

  await availableIcon.click();
  await expect(availableTag).not.toHaveClass(/expanded/);
  await expect(availableIcon).toHaveClass(/corridor-hidden/);
  await expect(availableIcon).toHaveAttribute('data-corridor-visible', 'false');
  await expect(otherAvailableIcon).not.toHaveClass(/corridor-hidden/);
  await expect(otherAvailableIcon).toHaveAttribute('data-corridor-visible', 'true');

  await availableIcon.click();
  await expect(availableIcon).not.toHaveClass(/corridor-hidden/);
  await expect(availableIcon).toHaveAttribute('data-corridor-visible', 'true');

  const unavailableIcon = page.locator('#TTE-UIO .corridor-icon-unavailable');
  await expect(unavailableIcon).toBeVisible();
  await expect(unavailableIcon).not.toHaveClass(/corridor-toggleable/);
  await unavailableIcon.click();

  const events = await page.evaluate(() => window.__corridorToggleEvents);
  expect(events).toEqual([
    { pairId: 'PER-LHR', visible: false },
    { pairId: 'PER-LHR', visible: true }
  ]);
});
