import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const restrictImports = (patterns) => ({
  'no-restricted-imports': ['error', { patterns }],
});

const NOT_APP = { group: ['@/app/*'], message: 'Layers point one way: app -> features -> shared.' };
const NOT_FEATURES = {
  group: ['@/features/*'],
  message: 'Layers point one way: app -> features -> shared.',
};
const FEATURE_PUBLIC_API = {
  group: ['@/features/*/*'],
  message: "Import another feature only through its public index, '@/features/<name>'.",
};
const NOT_HTTP_LIBRARY = {
  group: ['axios'],
  message: 'Only src/shared/lib/http may use axios. Call an API service instead.',
};
const NOT_HTTP_CLIENT = {
  // Exact paths on purpose: the error helpers in shared/lib/http/errors are fine for components.
  regex: '^(@/shared/lib/http(/client|/index)?|(\\.\\./)+api|.*/features/[^/]+/api)$',
  message: 'Components never call APIs: component -> hook -> API service -> http client.',
};

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'public', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  { files: ['scripts/**'], languageOptions: { globals: globals.node } },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.strictTypeChecked],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'error',
      ...restrictImports([NOT_HTTP_LIBRARY, FEATURE_PUBLIC_API]),
    },
  },
  {
    files: ['src/shared/lib/http/**'],
    rules: restrictImports([FEATURE_PUBLIC_API]),
  },
  {
    files: ['src/shared/**'],
    ignores: ['src/shared/lib/http/**'],
    rules: restrictImports([NOT_APP, NOT_FEATURES, NOT_HTTP_LIBRARY]),
  },
  {
    files: ['src/features/**'],
    rules: restrictImports([NOT_APP, NOT_HTTP_LIBRARY, FEATURE_PUBLIC_API]),
  },
  {
    files: ['src/**/components/**', 'src/**/pages/**'],
    rules: restrictImports([NOT_APP, NOT_HTTP_LIBRARY, NOT_HTTP_CLIENT, FEATURE_PUBLIC_API]),
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
);
