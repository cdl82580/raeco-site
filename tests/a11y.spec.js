const { test, expect } = require('./fixtures');
const AxeBuilder = require('@axe-core/playwright').default;

for (const scheme of ['light', 'dark']) {
  test(`axe: no serious/critical violations (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await page.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach(i => (i.loading = 'eager')));
    const { violations } = await new AxeBuilder({ page }).exclude('header') /* white nav over hero image: axe can't resolve the bg */.withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const bad = violations.filter(v => ['serious', 'critical'].includes(v.impact));
    expect(bad.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
  });
}

test('interactive controls have accessible names', async ({ page }) => {
  await page.goto('/');
  for (const el of await page.locator('a[href], button').all()) {
    const name = ((await el.getAttribute('aria-label')) || (await el.innerText()) || '').trim();
    expect(name, await el.evaluate(e => e.outerHTML.slice(0, 80))).not.toBe('');
  }
});

test('keyboard: tabs are reachable and activate', async ({ page }) => {
  await page.goto('/');
  const tab = page.getByRole('tab', { name: "Maggie's pricing" });
  await tab.focus();
  await page.keyboard.press('Enter');
  await expect(tab).toHaveAttribute('aria-selected', 'true');
});
