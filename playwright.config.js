import { defineConfig } from '@playwright/test';

// Configuration Playwright pour le test end-to-end.
// Playwright démarre lui-même le serveur avant les tests grâce à `webServer`.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4319',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'node src/server.js',
    url: 'http://localhost:4319',
    env: { PORT: '4319' },
    reuseExistingServer: false,
    timeout: 20_000,
  },
});
