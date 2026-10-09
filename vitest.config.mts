import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Convention de nommage générée par la Schematics CLI (`index_spec.ts`).
    include: ['src/**/*_spec.ts'],
    environment: 'node',
    testTimeout: 30000,
  },
});
