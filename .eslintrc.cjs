/* ESLint 8 config for the TypeScript test/utility code. Run with `npm run lint`. */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2021, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { node: true, es2021: true },
  ignorePatterns: ['node_modules/', 'dist/', 'playwright-report/', 'test-results/', 'reports/', 'mcp/exploration-output/'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
