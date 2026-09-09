import { expect, test } from '@playwright/test';

const APP_URL = '/index.html?diagnostics=1';

async function waitForMainMap(page) {
  try {
    await expect.poll(async () => page.evaluate(() => window.__gcvDiagnostics?.mainMap?.().rendered ?? false), {
      timeout: 15_000,
      message: 'main map should render after startup'
    }).toBe(true);
  } catch (error) {
    const state = await page.evaluate(() => window.__gcvDiagnostics?.mainMap?.());
    throw new Error(`main map did not render: ${JSON.stringify(state)}\n${error.message}`);
  }
}

test('initial startup creates one visible main map', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await waitForMainMap(page);

  const state = await page.evaluate(() => window.__gcvDiagnostics.mainMap());
  expect(state.creationCount).toBe(1);
  expect(state.rendered).toBe(true);
  expect(state.container.width).toBeGreaterThan(0);
  expect(state.container.height).toBeGreaterThan(0);
  expect(Number.isFinite(state.rotationX)).toBe(true);
  expect(Number.isFinite(state.rotationY)).toBe(true);
  expect(Number.isFinite(state.zoomLevel)).toBe(true);
  expect(consoleErrors).toEqual([]);
});

test('initial startup creates one visible main map when projection config is slow', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.route('**/data/projections.json', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    await route.continue();
  });

  await page.goto(`${APP_URL}&slowProjectionConfig=1`, { waitUntil: 'networkidle' });
  await waitForMainMap(page);

  const state = await page.evaluate(() => window.__gcvDiagnostics.mainMap());
  expect(state.creationCount).toBe(1);
  expect(state.rendered).toBe(true);
  expect(consoleErrors).toEqual([]);
});

test('main map remains visible over repeated cold reloads', async ({ browser }) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    try {
      await page.goto(`${APP_URL}&attempt=${attempt}`, { waitUntil: 'networkidle' });
      await waitForMainMap(page);

      const state = await page.evaluate(() => window.__gcvDiagnostics.mainMap());
      expect(state.creationCount, `cold reload ${attempt + 1}`).toBe(1);
      expect(state.rendered, `cold reload ${attempt + 1}`).toBe(true);
      expect(consoleErrors, `cold reload ${attempt + 1}`).toEqual([]);
    } finally {
      await context.close();
    }
  }
});

test('updating flight paths replaces the rendered main map once', async ({ page }) => {
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await waitForMainMap(page);

  await page.getByRole('button', { name: 'Update Flight Paths' }).click();
  await waitForMainMap(page);

  const state = await page.evaluate(() => window.__gcvDiagnostics.mainMap());
  expect(state.creationCount).toBe(2);
  expect(state.disposalCount).toBe(1);
  expect(state.rendered).toBe(true);
});
