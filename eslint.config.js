import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/dist-test/**',
      '**/node_modules/**',
      'src/**',
      'tests/**',
      'packages/bank-architecture/**',
      'packages/bank-hcip/src/questions.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-irregular-whitespace': ['error', { skipJSXText: true }],
    },
  },
  {
    files: ['apps/api/scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
      },
    },
  },
);
