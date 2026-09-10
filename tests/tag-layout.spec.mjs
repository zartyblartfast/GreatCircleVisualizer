import { expect, test } from '@playwright/test';

async function waitForMainMap(page) {
  await expect.poll(() => page.evaluate(() => window.__gcvDiagnostics?.mainMap?.().rendered ?? false), {
    timeout: 15_000,
    message: 'main map should render before tag interaction'
  }).toBe(true);
}

function rectSnapshot(locator) {
  return locator.boundingBox();
}

test('tag expansion keeps map layout stable and preserves route events', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/index.html?diagnostics=1&tagLayout=1', { waitUntil: 'networkidle' });
  await waitForMainMap(page);

  const map = page.locator('#chartdiv1');
  const firstTag = page.locator('#PER-LHR');
  const secondTag = page.locator('#LAX-DXB');
  await expect(firstTag).toBeVisible();
  await expect(secondTag).toBeVisible();

  await page.evaluate(() => {
    window.__tagEvents = [];
    document.addEventListener('pairExpandCollapse', (event) => {
      window.__tagEvents.push(event.detail);
    });
    window.__tagRootBeforeInteraction = window.am5.registry.rootElements.find(
      (root) => root.dom?.id === 'chartdiv1'
    );
  });

  const before = await rectSnapshot(map);
  await firstTag.click();
  await page.waitForTimeout(850);

  const afterExpansion = await rectSnapshot(map);
  expect(await page.locator('.tag.expanded').count()).toBe(1);
  expect(Math.abs(afterExpansion.x - before.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(afterExpansion.width - before.width)).toBeLessThanOrEqual(1);

  await secondTag.click();
  await page.waitForTimeout(850);

  const afterSelectionChange = await rectSnapshot(map);
  expect(await page.locator('.tag.expanded').count()).toBe(1);
  await expect(firstTag).not.toHaveClass(/expanded/);
  await expect(secondTag).toHaveClass(/expanded/);
  expect(Math.abs(afterSelectionChange.x - before.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(afterSelectionChange.width - before.width)).toBeLessThanOrEqual(1);

  const state = await page.evaluate(() => ({
    rootChanged: window.am5.registry.rootElements.find((root) => root.dom?.id === 'chartdiv1') !== window.__tagRootBeforeInteraction,
    events: window.__tagEvents
  }));

  expect(state.rootChanged).toBe(false);
  expect(state.events).toEqual(expect.arrayContaining([
    { pairId: 'PER-LHR', expanded: true },
    { pairId: 'PER-LHR', expanded: false },
    { pairId: 'LAX-DXB', expanded: true }
  ]));
  expect(consoleErrors).toEqual([]);
});
