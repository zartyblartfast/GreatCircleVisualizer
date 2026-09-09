import { expect, test } from '@playwright/test';

test.setTimeout(180_000);

const APP_URL = '/index.html?diagnostics=1';
const CENTER_TOLERANCE_PERCENT = 5;

async function waitForMainMap(page) {
  await expect.poll(() => page.evaluate(() => window.__gcvDiagnostics?.mainMap?.().rendered ?? false), {
    timeout: 15_000,
    message: 'main map should render'
  }).toBe(true);
}

async function selectProjection(page, name) {
  await page.evaluate((value) => {
    const select = document.getElementById('projectionSelect');
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, name);
  await page.waitForTimeout(850);
}

async function compositedBounds(page) {
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
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const index = (y * width + x) * 4;
        if (pixels[index + 3] > 20 && (pixels[index] < 245 || pixels[index + 1] < 245 || pixels[index + 2] < 245)) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    return {
      canvas: { width, height },
      bounds: { minX, minY, maxX, maxY },
      offsetPercent: { x: ((centerX - width / 2) / width) * 100, y: ((centerY - height / 2) / height) * 100 }
    };
  });
}

test('every visible projection remains visually centred through a full dropdown sequence', async ({ page }) => {
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await waitForMainMap(page);
  const projections = await page.evaluate(() => [...document.querySelectorAll('#projectionSelect option')].map(option => ({ label: option.textContent, value: option.value })));
  const failures = [];

  for (const projection of projections) {
    await selectProjection(page, projection.value);
    const measurement = await compositedBounds(page);
    if (Math.abs(measurement.offsetPercent.x) > CENTER_TOLERANCE_PERCENT) {
      failures.push({ ...projection, axis: 'x', ...measurement });
    }
  }

  expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
});
