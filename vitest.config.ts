import { defineConfig } from 'vitest/config';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: [
      'modules/jobs/**',
      'node_modules/**',
      '**/node_modules/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@pts/domain': path.resolve(__dirname, './packages/domain/src/index.ts'),
      '@pts/adapters': path.resolve(__dirname, './packages/adapters/src/index.ts'),
    },
  },
});
