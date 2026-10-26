import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

export default [
  // TypeScript files are checked by `npm run typecheck` (tsc)
  { ignores: ['dist', '**/*.ts', '**/*.tsx'] },
  js.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  reactRefresh.configs.vite,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/prop-types': 'off',
    },
    settings: { react: { version: 'detect' } },
  },
  // the browser checks and their stand-in for the API run in Node
  {
    files: ['e2e/**/*.{js,mjs}', 'playwright.config.js'],
    languageOptions: { globals: { ...globals.node } },
    // fields left out of a copy ({ secret, ...rest }) and callbacks with arguments they do not need
    rules: { 'no-unused-vars': ['error', { ignoreRestSiblings: true, args: 'none' }] },
  },
]
