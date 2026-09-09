import { expect, test } from '@playwright/test';

async function waitForMainMap(page) {
  await expect.poll(() => page.evaluate(() => window.__gcvDiagnostics?.mainMap?.().rendered ?? false), {
    timeout: 15_000,
    message: 'main map should render'
  }).toBe(true);
}

async function compositedVerticalOffset(page) {
  return page.evaluate(() => {
    const layers = [...document.querySelectorAll('#chartdiv1 canvas')];
    const { width, height } = layers.at(-1);
    const composite = document.createElement('canvas');
    composite.width = width;
    composite.height = height;
    const context = composite.getContext('2d', { willReadFrequently: true });
    layers.forEach(layer => context.drawImage(layer, 0, 0));
    const pixels = context.getImageData(0, 0, width, height).data;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) {
      const index = (y * width + x) * 4;
      if (pixels[index + 3] > 20 && (pixels[index] < 245 || pixels[index + 1] < 245 || pixels[index + 2] < 245)) {
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    }
    return { width, height, bounds: { minX, minY, maxX, maxY }, offsetPercent: { x: (((minX + maxX) / 2) - width / 2) / width * 100, y: (((minY + maxY) / 2) - height / 2) / height * 100 } };
  });
}

for (const sourceProjection of ['geoTwoPointAzimuthalUsa', 'geoModifiedStereographicMiller']) {
  test(`globe is centered after ${sourceProjection}`, async ({ page }) => {
  await page.goto('/index.html?diagnostics=1', { waitUntil: 'networkidle' });
  await waitForMainMap(page);
  await page.evaluate((value) => {
    const select = document.getElementById('projectionSelect');
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, sourceProjection);
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const toggle = document.getElementById('globe-toggle');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(800);

  const result = await compositedVerticalOffset(page);
  expect(Math.abs(result.offsetPercent.x), JSON.stringify(result)).toBeLessThanOrEqual(5);
  expect(Math.abs(result.offsetPercent.y), JSON.stringify(result)).toBeLessThanOrEqual(5);
  });
}
