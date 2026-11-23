const { test, expect } = require('./fixtures');

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('burger toggles menu and closes on link click', async ({ page }) => {
  const nav = page.locator('#nav');
  await expect(nav).toBeHidden();
  await page.locator('#burger').click();
  await expect(nav).toBeVisible();
  await nav.getByRole('link', { name: 'Team' }).click();
  await expect(nav).toBeHidden();
  await expect(page).toHaveURL(/#team$/);
});

test('top Book Now hidden, sticky bar visible', async ({ page }) => {
  await expect(page.locator('.book-top')).toBeHidden();
  const bar = page.locator('.sticky-book');
  await expect(bar).toBeVisible();
  await expect(bar.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:+19787331126');
  await expect(bar.getByRole('link', { name: 'Book Now' })).toHaveAttribute('href', /vagaro/);
});

test('no horizontal overflow', async ({ page }) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('hero photo shows above text', async ({ page }) => {
  const img = await page.locator('.hero-photo').boundingBox();
  const h1 = await page.locator('h1').boundingBox();
  expect(img.y).toBeLessThan(h1.y);
});

test('tap targets in sticky bar are at least 44px tall', async ({ page }) => {
  for (const b of await page.locator('.sticky-book .btn').all()) {
    expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
  }
});
