const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:4173', trace: 'on-first-retry' },
  webServer: {
    command: 'npx serve -l 4173 --no-clipboard .',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'static', testMatch: /static\.spec\.js/ },
    { name: 'desktop', testMatch: /(site|a11y)\.spec\.js/, use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', testMatch: /(site|mobile|a11y)\.spec\.js/, use: { ...devices['Pixel 7'] } },
    { name: 'webkit', testMatch: /site\.spec\.js/, use: { ...devices['Desktop Safari'] } },
  ],
});
