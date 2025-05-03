import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/cli/index.ts', // Entry point for the CLI
    'src/mcp/server.ts', // Entry point for the MCP server
  ],
  format: ['esm'], // Output ES Module format
  dts: false, // Generate declaration files (.d.ts)
  splitting: false, // Keep code bundled per entry point initially
  sourcemap: true, // Generate sourcemaps for debugging
  clean: true, // Clean output directory before build
  outDir: 'dist', // Output directory (matches tsconfig)
  tsconfig: './tsconfig.json', // Ensure tsup uses the correct tsconfig
});
