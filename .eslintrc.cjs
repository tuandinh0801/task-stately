module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'prettier'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended' // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  env: {
    node: true,
    es2022: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json', // Link ESLint to TSConfig for type-aware linting
  },
  ignorePatterns: ['node_modules', 'dist', '.eslintrc.cjs', 'tsup.config.ts', 'vitest.config.ts'],
  rules: {
    'prettier/prettier': 'warn', // Show Prettier issues as warnings
    // Add any project-specific rule overrides here
  }
};