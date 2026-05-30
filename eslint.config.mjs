import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  {
    ignores: [
      'modules/rnds/**',
      'modules/jobs/**',
      'modules/groups/**',
      'app/(app)/groups/**',
      'modules/settings/ivc/**',
      'app/(app)/settings/ivc/**',
      'modules/pts/workers/cadunico-etl.worker.ts',
      '**/intersectoral-task.service.ts',
      'modules/pts/services/sync.service.ts',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'PTS/**',
    ],
  },
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'warn',
    },
  },
  prettier,
]);

export default eslintConfig;

