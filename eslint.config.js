import eslint from '@eslint/js';
import typescriptParser from '@typescript-eslint/parser';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

const parser = typescriptParser;

export default [
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript recommended rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,
    },
  },

  // Prettier integration
  {
    plugins: {
      prettier: prettier,
    },
    rules: {
      'prettier/prettier': 'warn', // Show Prettier issues as warnings
      // Add any project-specific rule overrides here
    },
  },

  // Apply prettier config (must be last to disable conflicting rules)
  prettierConfig,

  // Global settings that apply to all files
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: parser,
      parserOptions: {
        project: './tsconfig.json', // Link ESLint to TSConfig for type-aware linting
      },
      globals: {
        // Node.js global variables
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'writable',
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        // ES2022 globals
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },

    // Files to ignore
    ignores: [
      'node_modules/**',
      'dist/**',
      '.eslintrc.cjs',
      'eslint.config.cjs',
      'tsup.config.ts',
      'vitest.config.ts',
    ],
  },
];
