import { expect, test } from '@playwright/test';

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
  await page.waitForTimeout(1_200);
}

async function compositedCenterOffset(page) {
  return page.evaluate(() => {
    const layers = [...document.querySelectorAll('#chartdiv1 canvas')];
    const { width, height } = layers.at(-1);
    const image = document.createElement('canvas');
    image.width = width;
    image.height = height;
    const context = image.getContext('2d', { willReadFrequently: true });
    layers.forEach(layer => context.drawImage(layer, 0, 0));
    const pixels = context.getImageData(0, 0, width, height).data;
    let minX = width;
    let maxX = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        if (pixels[index + 3] > 20 && (pixels[index] < 245 || pixels[index + 1] < 245 || pixels[index + 2] < 245)) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        }
      }
    }
    return { width, minX, maxX, offsetPercent: (((minX + maxX) / 2) - width / 2) / width * 100 };
  });
}

test('Two-Point Azimuthal USA is horizontally centered after projection selection', async ({ page }) => {
  await page.goto('/index.html?diagnostics=1', { waitUntil: 'networkidle' });
  await waitForMainMap(page);
  await selectProjection(page, 'geoTwoPointAzimuthalUsa');

  const result = await compositedCenterOffset(page);
  expect(Math.abs(result.offsetPercent), JSON.stringify(result)).toBeLessThanOrEqual(5);
});

test('ordinary projection remains centered after Two-Point Azimuthal USA', async ({ page }) => {
  await page.goto('/index.html?diagnostics=1', { waitUntil: 'networkidle' });
  await waitForMainMap(page);
  await selectProjection(page, 'geoTwoPointAzimuthalUsa');
  await selectProjection(page, 'geoEqualEarth');

  const result = await compositedCenterOffset(page);
  expect(Math.abs(result.offsetPercent), JSON.stringify(result)).toBeLessThanOrEqual(5);
});

test('Two-Point Azimuthal USA and Equal Earth remain centered after a viewport resize', async ({ page }) => {
  await page.goto('/index.html?diagnostics=1', { waitUntil: 'networkidle' });
  await waitForMainMap(page);
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.waitForTimeout(400);

  await selectProjection(page, 'geoTwoPointAzimuthalUsa');
  const twoPoint = await compositedCenterOffset(page);
  expect(Math.abs(twoPoint.offsetPercent), JSON.stringify(twoPoint)).toBeLessThanOrEqual(5);

  await selectProjection(page, 'geoEqualEarth');
  const equalEarth = await compositedCenterOffset(page);
  expect(Math.abs(equalEarth.offsetPercent), JSON.stringify(equalEarth)).toBeLessThanOrEqual(5);
});
