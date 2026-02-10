/* eslint-env node */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  ignorePatterns: ['backend/dist', 'dist', 'node_modules', '*.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  settings: { react: { version: 'detect' } },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }],
    '@typescript-eslint/no-var-requires': 'warn',
    'no-async-promise-executor': 'warn',
    '@typescript-eslint/ban-types': ['warn', { 'types': { 'Function': false } }],
    'prefer-const': 'warn',
    'no-empty': 'warn',
    'no-dupe-else-if': 'warn',
    'no-case-declarations': 'warn',
    'react/no-unescaped-entities': 'warn',
  },
  overrides: [
    {
      files: ['backend/**/*.ts', 'backend/**/*.js'],
      env: { node: true },
    },
    {
      files: ['types/**/*.ts', '**/*.d.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
  ],
};
