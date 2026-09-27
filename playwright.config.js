import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
        // Separate simulated clients keep route limits independent across projects.
        extraHTTPHeaders: { 'X-Forwarded-For': '192.0.2.1' },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        defaultBrowserType: 'chromium',
        extraHTTPHeaders: { 'X-Forwarded-For': '192.0.2.2' },
      },
    },
  ],
  webServer: {
    command: 'node scripts/e2e-server.js',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 120000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10000 },
  },
})
