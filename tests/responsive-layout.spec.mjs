import { expect, test } from '@playwright/test';

async function waitForMainMap(page) {
  await expect.poll(() => page.evaluate(() => window.__gcvDiagnostics?.mainMap?.().rendered ?? false), {
    timeout: 15_000,
    message: 'main map should render'
  }).toBe(true);
}

async function layoutState(page) {
  return page.evaluate(() => {
    const main = document.querySelector('.main-container');
    const map = document.querySelector('#chartdiv1');
    const rect = (selector) => {
      const bounds = document.querySelector(selector)?.getBoundingClientRect();
      return bounds && { x: bounds.x, right: bounds.right };
    };
    const mainStyle = getComputedStyle(main);
    const mapRect = map.getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      flexDirection: mainStyle.flexDirection,
      controlWidth: document.querySelector('.grid-wrapper').getBoundingClientRect().width,
      tagsWidth: document.querySelector('.location-pair-tags-container').getBoundingClientRect().width,
      map: { x: mapRect.x, width: mapRect.width },
      fields: {
        countryB: rect('#country-b-dropdown'),
        countryInfo: rect('.country-b-info'),
        airportB: rect('#airport-b-filter-search'),
        airportInfo: rect('.airport-b-info')
      },
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
    };
  });
}

test('wide layout remains side-by-side without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto('/index.html?diagnostics=1&responsive=wide', { waitUntil: 'networkidle' });
  await waitForMainMap(page);

  const state = await layoutState(page);
  expect(state.flexDirection).toBe('row');
  expect(state.hasHorizontalOverflow).toBe(false);
});

test('narrow layout stacks controls and map without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 1200 });
  await page.goto('/index.html?diagnostics=1&responsive=narrow', { waitUntil: 'networkidle' });
  await waitForMainMap(page);

  const state = await layoutState(page);
  expect(state.flexDirection).toBe('column');
  expect(state.hasHorizontalOverflow).toBe(false);
  expect(Math.abs(state.tagsWidth - state.controlWidth)).toBeLessThanOrEqual(1);
  expect(state.map.width).toBeLessThanOrEqual(state.viewportWidth);
  expect(state.fields.countryInfo.x - state.fields.countryB.right).toBeGreaterThanOrEqual(0);
  expect(state.fields.countryInfo.x - state.fields.countryB.right).toBeLessThanOrEqual(15);
  expect(state.fields.airportInfo.x - state.fields.airportB.right).toBeGreaterThanOrEqual(0);
  expect(state.fields.airportInfo.x - state.fields.airportB.right).toBeLessThanOrEqual(15);
});
