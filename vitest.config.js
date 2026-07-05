import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Vitest gère les tests unitaires et d'intégration.
    // Les tests E2E (Playwright) sont exclus car pilotés par leur propre runner.
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
    environment: 'node',
  },
});
