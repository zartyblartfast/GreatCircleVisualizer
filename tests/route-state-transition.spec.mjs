import { expect, test } from '@playwright/test';

async function waitForMap(page) {
  await expect.poll(() => page.evaluate(() => window.__gcvDiagnostics?.mainMap?.().rendered ?? false), { timeout: 15_000 }).toBe(true);
}

async function corridorState(page) {
  return page.evaluate(() => {
    const tag = document.querySelector('.tag:has(.corridor-icon)');
    const layers = [...document.querySelectorAll('#chartdiv1 canvas')];
    const canvas = layers.at(-1);
    const composite = document.createElement('canvas');
    composite.width = canvas.width;
    composite.height = canvas.height;
    const context = composite.getContext('2d', { willReadFrequently: true });
    layers.forEach(layer => context.drawImage(layer, 0, 0));
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let bluePixels = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const [red, green, blue, alpha] = pixels.slice(index, index + 4);
      if (alpha > 100 && blue > 120 && blue > red * 1.3 && blue > green * 1.1) bluePixels += 1;
    }
    return { tagId: tag?.id, expanded: tag?.classList.contains('expanded'), bluePixels };
  });
}

test('expanded flight corridor survives map-to-globe-to-map transition', async ({ page }) => {
  await page.goto('/index.html?diagnostics=1', { waitUntil: 'networkidle' });
  await waitForMap(page);
  const tag = page.locator('.tag:has(.corridor-icon)').first();
  await expect(tag).toBeVisible();
  await tag.click();
  await page.waitForTimeout(800);
  const before = await corridorState(page);
  expect(before.expanded).toBe(true);
  expect(before.bluePixels).toBeGreaterThan(10);

  await page.evaluate(() => {
    const toggle = document.getElementById('globe-toggle');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const toggle = document.getElementById('globe-toggle');
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(1_000);

  const after = await corridorState(page);
  expect(after.tagId).toBe(before.tagId);
  expect(after.expanded).toBe(true);
  expect(after.bluePixels).toBeGreaterThan(10);
});
