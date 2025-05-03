import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths'; // Use vite plugin for tsconfig paths

export default defineConfig({
  plugins: [tsconfigPaths()], // Enable tsconfig path resolution in tests
  test: {
    globals: true, // Make Vitest APIs globally available (describe, it, etc.)
    environment: 'jsdom', // Use jsdom for React/Ink testing
    coverage: {
      provider: 'v8', // Use V8's built-in coverage
      reporter: ['text', 'json', 'html'], // Output formats for coverage report
      include: ['src/**/*.ts'], // Files to include in coverage
      exclude: [
        // Files/patterns to exclude
        'src/types/**/*.ts',
        'src/**/index.ts', // Often just barrel files
        'src/**/*.test.ts',
        'src/cli/components/**/*', // UI components might need different testing strategy
        'node_modules',
        'dist',
      ],
    },
  },
});
