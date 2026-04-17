import stylistic from '@stylistic/eslint-plugin'
import tseslint from 'typescript-eslint'

/**
 * Rules enforcing transport layer isolation.
 * Add to apps that must use @my-app/api-client instead of fetch/axios directly.
 */
export const transportIsolationRules = {
  'no-restricted-imports': [
    'error',
    {
      paths: [
        { name: 'axios', message: 'Use @my-app/api-client instead of axios.' },
        { name: 'node-fetch', message: 'Use @my-app/api-client instead of node-fetch.' },
      ],
      patterns: [
        { group: ['axios/*'], message: 'Use @my-app/api-client instead of axios.' },
      ],
    },
  ],
  'no-restricted-globals': [
    'error',
    { name: 'fetch', message: 'Use @my-app/api-client instead of fetch directly.' },
  ],
}

/**
 * @param {string} tsconfigRootDir - pass `import.meta.dirname` from the app config
 */
export const baseConfig = (tsconfigRootDir) =>
  tseslint.config(
    tseslint.configs.recommendedTypeChecked,
    {
      languageOptions: {
        parserOptions: {
          project: true,
          tsconfigRootDir,
        },
      },
      plugins: {
        '@stylistic': stylistic,
      },
      rules: {
        // Promise safety
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/await-thenable': 'error',

        // Stylistic
        '@stylistic/indent': ['error', 2],
        '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
        '@stylistic/semi': ['error', 'never'],
      },
    },
  )
