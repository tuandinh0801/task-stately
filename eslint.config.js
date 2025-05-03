/* eslint-disable @typescript-eslint/no-require-imports */

const globals = require('globals');
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const reactRefreshPlugin = require('eslint-plugin-react-refresh');
const prettierConfig = require('eslint-config-prettier');

module.exports = tseslint.config(
  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.eslintrc.cjs', // Old config file
      'eslint.config.cjs', // Old config file name possibility
      // Add other build artifacts or generated files if needed
    ],
  },

  // Base ESLint recommended rules
  js.configs.recommended,

  // Basic TS config for JS/TS files (no type checking)
  ...tseslint.configs.recommended,
  {
    // Apply basic TS rules globally first
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      // Add general TS/JS rules if needed
    },
  },

  // Type-checked TS configuration (applied only to src/** files)
  // Uses strict type-checked rules, excluding config files
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: ['src/**/*.{ts,tsx}'], // IMPORTANT: Limit type-checking to src
  })),
  {
    // Specific overrides for TypeScript settings within src/**
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: true, // Enable type-aware linting for src
        tsconfigRootDir: __dirname, // Correctly locate tsconfig.json
      },
    },
    rules: {
      // Temporarily disable unsafe rules to reduce noise - ADDRESS THESE LATER!
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
    },
  },

  // React specific configuration (applied only to src/**/*.{jsx,tsx} files)
  {
    files: ['src/**/*.{jsx,tsx}'], // Target only React files within src
    ...reactPlugin.configs.flat.recommended, // React core rules
    languageOptions: {
      // Don't inherit from reactPlugin.configs.flat.recommended here,
      // rely on the global tseslint parser setup
      parserOptions: {
        ecmaFeatures: { jsx: true }, // Ensure JSX is enabled
      },
      globals: {
        ...globals.browser, // Add browser globals for React components
      },
    },
    settings: {
      react: {
        version: 'detect', // Automatically detect React version
      },
    },
    rules: {
      // Add any project-specific React rule overrides here
      'react/react-in-jsx-scope': 'off', // Not needed with new JSX transform
      'react/prop-types': 'off', // Not needed when using TypeScript
    },
  },

  // React Hooks configuration (applied only to src/**/*.{jsx,tsx} files)
  {
    files: ['src/**/*.{jsx,tsx}'], // Target only React files within src
    plugins: { 'react-hooks': reactHooksPlugin },
    rules: reactHooksPlugin.configs.recommended.rules, // Rules of Hooks and Exhaustive Deps
  },

  // React Refresh configuration (applied only to src/**/*.{jsx,tsx} files)
  {
    files: ['src/**/*.{jsx,tsx}'], // Target only React files within src
    plugins: { 'react-refresh': reactRefreshPlugin },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true }, // Allow constants like loaders/actions in Remix/React Router
      ],
    },
  },

  // Ensure config files themselves use Node globals (overriding browser globals if necessary)
  {
    files: ['eslint.config.js', 'tsup.config.ts', 'vitest.config.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Prettier configuration (must be last to override other formatting rules)
  prettierConfig
);
