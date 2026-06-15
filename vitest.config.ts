import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const nodeSqliteShim = fileURLToPath(
  new URL('./tests/support/nodeSqlite.ts', import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: {
      'node:sqlite': nodeSqliteShim,
      sqlite: nodeSqliteShim,
    },
  },
  test: {
    environment: 'node',
  },
});
