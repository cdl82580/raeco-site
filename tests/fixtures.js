const base = require('@playwright/test');

// Block third-party hosts so tests are fast and deterministic.
exports.test = base.test.extend({
  page: async ({ page }, use) => {
    await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
    await use(page);
  },
});
exports.expect = base.expect;
