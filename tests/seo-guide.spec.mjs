import { expect, test } from '@playwright/test';

test('guide is readable and navigable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/guide/`);
  await expect(page).toHaveTitle('Great Circle Routes & Rhumb Lines: A Practical Guide | GreatCircleVisualizer');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://greatcirclevisualizer.com/guide/');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /worked Perth–London example/);
  await expect(page.getByRole('heading', { name: 'How to plot a route between airports' })).toBeVisible();
  await expect(page.getByRole('img')).toHaveAttribute('alt', /red great circle and black rhumb line/);
  for (const href of await page.locator('a[href^="#"]').evaluateAll(links => links.map(a => a.getAttribute('href')))) {
    await expect(page.locator(href)).toHaveCount(1);
  }
  await page.getByRole('link', { name: 'Open the interactive map' }).click();
  await expect(page).toHaveURL(`${baseURL}/`);
  await expect(page.locator('header h1')).toHaveText('Great Circle Visualizer');
  await page.getByRole('link', { name: 'How it works', exact: true }).click();
  await expect(page).toHaveURL(`${baseURL}/guide/`);
  await context.close();
});

test('guide fits desktop and mobile and loads its real-app illustration', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/guide/');
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.locator('figure img').evaluate(img => img.complete && img.naturalWidth === 1406 && img.naturalHeight === 500)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`guide-${width}.png`), fullPage: true });
  }
});

test('sitemap and robots list only the intended canonical pages', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  const sitemap = await response.text();
  expect(sitemap).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  expect(urls).toEqual(['https://greatcirclevisualizer.com/', 'https://greatcirclevisualizer.com/guide/']);
  expect(sitemap).not.toContain('<lastmod>');
  for (const url of urls) expect((await request.get(new URL(url).pathname)).status()).toBe(200);
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect((await robots.text()).replace(/\r\n/g, '\n')).toBe('User-agent: *\nAllow: /\n\nSitemap: https://greatcirclevisualizer.com/sitemap.xml\n');
});

test('guide worked example matches the actual app card and independent formulas', async ({ page, request }) => {
  const pairs = await (await request.get('/data/suggestion_pairs.json')).json();
  const pair = pairs.find(p => p.id === 'PER-LHR');
  const rad = d => d * Math.PI / 180;
  const a = rad(pair.airportALat), b = rad(pair.airportBLat), dphi = b - a;
  let dlon = Math.abs(rad(pair.airportBLon - pair.airportALon));
  if (dlon > Math.PI) dlon = 2 * Math.PI - dlon;
  const h = Math.sin(dphi / 2) ** 2 + Math.cos(a) * Math.cos(b) * Math.sin(dlon / 2) ** 2;
  const gc = 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  const q = dphi / Math.log(Math.tan(b / 2 + Math.PI / 4) / Math.tan(a / 2 + Math.PI / 4));
  const rhumb = 6371 * Math.sqrt(dphi ** 2 + q ** 2 * dlon ** 2);
  // Stored suggested distances use a slightly different effective Earth radius;
  // check approximate agreement rather than inventing precision in the guide.
  expect(Math.abs(gc - pair.GreatCircleDistKm)).toBeLessThan(0.1);
  expect(Math.abs(rhumb - pair.RhumbLineDistKm)).toBeLessThan(0.1);
  const percentage = ((pair.RhumbLineDistKm - pair.GreatCircleDistKm) / pair.GreatCircleDistKm * 100).toFixed(2);
  await page.goto('/guide/');
  const rows = page.locator('#worked-example tbody tr');
  await expect(rows.nth(0)).toContainText(pair.GreatCircleDistKm.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
  await expect(rows.nth(1)).toContainText(pair.RhumbLineDistKm.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
  await expect(rows.nth(2)).toContainText(`+${percentage}%`);
  await page.goto('/index.html', { waitUntil: 'networkidle' });
  await page.locator('#PER-LHR .main-content').click();
  await expect(page.locator('#PER-LHR .additional-info')).toContainText('Great Circle: 14508.3');
  await expect(page.locator('#PER-LHR .additional-info')).toContainText(`Rhumb Line: 14767.8 (+${percentage}%)`);
  const link = page.getByRole('navigation', { name: 'Help', exact: true }).getByRole('link', { name: 'How it works' });
  await expect(link).toBeVisible();
  expect(await link.evaluate(el => !!el.closest('header') && !el.closest('main'))).toBe(true);
  const layout = await link.evaluate(el => {
    const header = el.closest('header');
    const nav = el.closest('nav');
    const intro = header.querySelector('p').getBoundingClientRect();
    const linkRect = el.getBoundingClientRect();
    const before = { header: header.getBoundingClientRect().height, main: document.querySelector('main').getBoundingClientRect().top };
    nav.remove();
    const after = { header: header.getBoundingClientRect().height, main: document.querySelector('main').getBoundingClientRect().top };
    header.append(nav);
    return { before, after, introBottom: intro.bottom, linkTop: linkRect.top, linkBottom: linkRect.bottom, headerBottom: header.getBoundingClientRect().bottom };
  });
  expect(layout.before).toEqual(layout.after);
  expect(layout.linkTop).toBeGreaterThanOrEqual(layout.introBottom);
  expect(layout.linkBottom).toBeLessThanOrEqual(layout.headerBottom);
  await page.screenshot({ path: test.info().outputPath('app-header-link.png') });
});
