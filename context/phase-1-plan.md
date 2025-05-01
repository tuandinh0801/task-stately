# Task-Stately: Phase 1 Detailed Plan

**Goal:** Initialize the `task-stately` project, configure the development toolchain (TypeScript, build, lint, test), define core data types using Zod, and establish the basic directory structure.

**Prerequisites:**
*   Node.js (LTS version recommended) installed.
*   `pnpm` installed (`npm install -g pnpm` or similar).
*   Current directory: `/Users/Shared/ssd/Work/task-stately`

---

## Detailed Steps & Rationale

**1. Initialize Project & Dependencies:**
*   **Action:** Run `pnpm init` in the `/Users/Shared/ssd/Work/task-stately` directory to create the `package.json` file. Accept defaults or customize as needed.
*   **Action:** Install core development dependencies:
    ```bash
    pnpm add -D typescript @types/node tsconfig-paths zod eslint prettier eslint-config-prettier eslint-plugin-prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser tsup vitest
    ```
*   **Rationale:** Installs TypeScript, type definitions, path alias helper, validation library (Zod), linting/formatting tools, build tool, and testing framework in one go.

**2. Configure TypeScript (`tsconfig.json`):**
*   **Action:** Create a `tsconfig.json` file in the project root.
*   **Action:** Populate `tsconfig.json` with the following configuration:
    ```json
    {
      "compilerOptions": {
        "target": "ES2022", // Target modern Node.js versions
        "module": "NodeNext", // Use modern ES modules
        "moduleResolution": "NodeNext", // How modules are resolved
        "baseUrl": ".", // Base directory for path aliases
        "paths": {
          "@/*": ["src/*"] // Alias for cleaner imports
        },
        "outDir": "./dist", // Where compiled JS goes
        "rootDir": "./src", // Source code root
        "strict": true, // Enable all strict type-checking options
        "esModuleInterop": true, // Allows default imports from commonjs modules
        "skipLibCheck": true, // Skip type checking of declaration files
        "forceConsistentCasingInFileNames": true, // Prevent case-related errors
        "jsx": "react-jsx", // Necessary for Ink/React
        "resolveJsonModule": true // Allow importing JSON files
      },
      "include": ["src/**/*", "tsup.config.ts", "vitest.config.ts"], // Files TS should process
      "exclude": ["node_modules", "dist"] // Folders to ignore
    }
    ```
*   **Rationale:** Sets up TypeScript for modern Node.js development with strict type checking, ES module support, path aliases, and JSX compilation required by Ink.

**3. Configure Build Tool (`tsup.config.ts`):**
*   **Action:** Create `tsup.config.ts` in the project root.
*   **Action:** Populate `tsup.config.ts` to define build entry points and options:
    ```typescript
    import { defineConfig } from 'tsup';

    export default defineConfig({
      entry: [
        'src/cli/index.ts', // Entry point for the CLI
        'src/mcp/server.ts'  // Entry point for the MCP server
      ],
      format: ['esm'], // Output ES Module format
      dts: true, // Generate declaration files (.d.ts)
      splitting: false, // Keep code bundled per entry point initially
      sourcemap: true, // Generate sourcemaps for debugging
      clean: true, // Clean output directory before build
      outDir: 'dist', // Output directory (matches tsconfig)
      tsconfig: './tsconfig.json' // Ensure tsup uses the correct tsconfig
    });
    ```
*   **Rationale:** Configures `tsup` to build separate bundles for the CLI and MCP server from the TypeScript source, generating necessary type definitions and sourcemaps.

**4. Configure Linting & Formatting:**
*   **Action:** Create `.eslintrc.cjs` in the project root:
    ```javascript
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
    ```
*   **Action:** Create `.prettierrc.json` in the project root:
    ```json
    {
      "semi": true,
      "singleQuote": true,
      "trailingComma": "es5",
      "printWidth": 80,
      "tabWidth": 2,
      "useTabs": false,
      "bracketSpacing": true,
      "arrowParens": "always"
    }
    ```
*   **Action:** Create `.prettierignore` in the project root:
    ```
    node_modules
    dist
    coverage
    tasks.json
    package-lock.json
    pnpm-lock.yaml
    yarn.lock
    ```
*   **Rationale:** Sets up ESLint for TypeScript code analysis and Prettier for consistent code formatting, integrating them so formatting issues are caught during linting.

**5. Configure Testing (`vitest.config.ts`):**
*   **Action:** Create `vitest.config.ts` in the project root.
*   **Action:** Populate `vitest.config.ts`:
    ```typescript
    import { defineConfig } from 'vitest/config';
    import tsconfigPaths from 'vite-tsconfig-paths'; // Use vite plugin for tsconfig paths

    export default defineConfig({
      plugins: [tsconfigPaths()], // Enable tsconfig path resolution in tests
      test: {
        globals: true, // Make Vitest APIs globally available (describe, it, etc.)
        environment: 'node', // Set the test environment to Node.js
        coverage: {
          provider: 'v8', // Use V8's built-in coverage
          reporter: ['text', 'json', 'html'], // Output formats for coverage report
          include: ['src/**/*.ts'], // Files to include in coverage
          exclude: [ // Files/patterns to exclude
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
    ```
*   **Rationale:** Configures Vitest test runner, enabling global APIs, setting the Node.js environment, configuring code coverage reporting, and ensuring TS path aliases work within tests.

**6. Define Core Types (`src/types/task.ts`):**
*   **Action:** Create the directory `src/types`.
*   **Action:** Create the file `src/types/task.ts`.
*   **Action:** Define Zod schemas and infer TypeScript types:
    ```typescript
    import { z } from 'zod';

    // Enums using Zod's enum helper for runtime and type safety
    export const TaskStatusSchema = z.enum([
      'pending',
      'in-progress',
      'review',
      'done',
      'blocked',
      'cancelled',
    ]);
    export type TaskStatus = z.infer<typeof TaskStatusSchema>;

    export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
    export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

    export const TaskTypeSchema = z.enum([
      'feature',
      'bug',
      'chore',
      'refactor',
      'docs',
      'test',
      'setup',
      'research',
    ]);
    export type TaskType = z.infer<typeof TaskTypeSchema>;

    // Define SubtaskSchema first because TaskSchema refers to it
    export const SubtaskSchema = z.object({
      id: z.string(), // Subtask IDs might be like "parentID.subIndex"
      title: z.string().min(1),
      status: TaskStatusSchema.default('pending'),
      createdAt: z.string().datetime().optional(), // Or z.date() if preferred
      updatedAt: z.string().datetime().optional(), // Or z.date()
      // Add other relevant subtask fields if needed (e.g., description, assignee)
    });
    export type Subtask = z.infer<typeof SubtaskSchema>;

    // Now define TaskSchema
    export const TaskSchema = z.object({
      id: z.string(), // Using string IDs for flexibility (UUIDs, sequential like "1", "2")
      title: z.string().min(1, 'Title cannot be empty'),
      description: z.string().optional(),
      status: TaskStatusSchema.default('pending'),
      priority: TaskPrioritySchema.default('medium'),
      type: TaskTypeSchema.default('feature'),
      complexity: z.number().int().min(1).max(10).optional(), // Scale 1-10
      dependencies: z.array(z.string()).default([]), // Array of Task IDs
      acceptanceCriteria: z.array(z.string()).default([]),
      artifacts: z.array(z.string()).default([]), // e.g., links to designs, PRs
      tags: z.array(z.string()).default([]),
      subtasks: z.array(SubtaskSchema).default([]), // Reference the defined SubtaskSchema
      assignee: z.string().optional(), // User ID or name
      createdAt: z.string().datetime(), // ISO 8601 format recommended
      updatedAt: z.string().datetime(), // ISO 8601 format recommended
    });
    export type Task = z.infer<typeof TaskSchema>; // Infer Task type

    // Example of a schema for the entire tasks file structure (Phase 2)
    export const TasksFileSchema = z.object({
      meta: z.object({
        schemaVersion: z.number().default(1),
        lastId: z.string().default('0'), // Store last numeric ID as string if sequential
      }),
      tasks: z.array(TaskSchema),
    });
    export type TasksFile = z.infer<typeof TasksFileSchema>;
    ```
*   **Rationale:** Establishes the canonical structure and validation rules for tasks and subtasks using Zod, providing both runtime validation and static TypeScript types. Using string IDs allows for more flexibility (e.g., UUIDs or prefixed IDs) later. Using string datetimes (ISO 8601) is often easier for JSON serialization.

**7. Create Initial Directory Structure:**
*   **Action:** Create the following directories within `src/`:
    *   `src/core`
    *   `src/core/storage`
    *   `src/core/utils`
    *   `src/cli`
    *   `src/cli/commands`
    *   `src/cli/components`
    *   `src/cli/utils`
    *   `src/mcp`
    *   `src/mcp/tools`
    *   `src/mcp/utils`
    *   `src/common` (Optional, as per architecture)
*   **Action:** Create placeholder `.gitkeep` files in empty directories if desired, to ensure Git tracks them (e.g., `touch src/core/utils/.gitkeep`).
*   **Rationale:** Sets up the project structure according to the approved architecture, preparing for code implementation in subsequent phases.

**8. Update `.gitignore`:**
*   **Action:** Ensure the existing `.gitignore` file contains at least the following entries:
    ```
    # Dependencies
    node_modules

    # Build output
    dist
    coverage

    # Task data (initially)
    tasks.json
    *.tasks.json.bak # Potential backup files

    # Logs
    logs
    *.log

    # Runtime data
    pids
    *.pid
    *.seed
    *.pid.lock

    # Environment variables
    .env
    .env.*
    !.env.example

    # OS generated files
    .DS_Store
    Thumbs.db

    # IDE config
    .vscode/
    .idea/

    # Test Artifacts
    /coverage/
    ```
*   **Rationale:** Prevents committing dependencies, build artifacts, sensitive data, logs, and OS/IDE-specific files to the repository. Includes `tasks.json` as specified.

**9. Add `package.json` Scripts:**
*   **Action:** Add the following scripts to your `package.json` file:
    ```json
    "scripts": {
      "build": "tsup",
      "dev": "tsup --watch",
      "start:cli": "node dist/cli/index.js", // Example: run compiled CLI
      "start:mcp": "node dist/mcp/server.js", // Example: run compiled MCP
      "typecheck": "tsc --noEmit",
      "lint": "eslint . --ext .ts,.tsx",
      "lint:fix": "eslint . --ext .ts,.tsx --fix",
      "format": "prettier --write .",
      "test": "vitest run",
      "test:watch": "vitest",
      "coverage": "vitest run --coverage",
      "validate:types": "pnpm typecheck", // Alias for clarity
      "validate": "pnpm validate:types && pnpm lint && pnpm test" // Run all checks
    },
    ```
*   **Rationale:** Provides convenient commands for common development tasks like building, type checking, linting, formatting, testing, and running the application (once built). The `validate` script is useful for pre-commit hooks or CI.

**Phase 1 Outcome (Detailed View):**
*   A `package.json` file defining project metadata and dependencies.
*   Configured TypeScript (`tsconfig.json`).
*   Configured build process (`tsup.config.ts`).
*   Configured linting and formatting (`.eslintrc.cjs`, `.prettierrc.json`, `.prettierignore`).
*   Configured testing (`vitest.config.ts`).
*   Core `Task` and `Subtask` types defined with Zod schemas in `src/types/task.ts`.
*   The basic directory structure (`src/core`, `src/cli`, `src/mcp`, etc.) is created.
*   An updated `.gitignore` file.
*   Essential scripts added to `package.json`.

**Visual Plan (Mermaid):**
```mermaid
graph TD
    A[1. Init Project & Deps] --> B(2. Configure TS);
    A --> C(3. Configure Build);
    A --> D(4. Configure Lint/Format);
    A --> E(5. Configure Test);
    A --> H(8. Update .gitignore);
    A --> I(9. Add package.json Scripts);

    B --> C;  // tsup config needs tsconfig location
    B --> D;  // eslint needs tsconfig location
    B --> E;  // vitest needs tsconfig paths
    B --> F(6. Define Core Types);

    F --> G(7. Create Dirs); // Types need src/types dir

    C --> I; // Build scripts
    D --> I; // Lint/Format scripts
    E --> I; // Test scripts

    subgraph Toolchain Setup
        B; C; D; E;
    end

    subgraph Project Structure
        F; G; H;
    end

    subgraph Execution
        I;
    end

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style G fill:#ccf,stroke:#333,stroke-width:2px
    style I fill:#cfc,stroke:#333,stroke-width:2px
```

---

## Actionable Subtasks

**Subtask 1.1: Initialize Project & Install Core Dependencies**
*   **Action:** Run `pnpm init` to create `package.json`.
*   **Action:** Run `pnpm add -D typescript @types/node tsconfig-paths zod eslint prettier eslint-config-prettier eslint-plugin-prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser tsup vitest`.
*   **Outcome:** `package.json` created, essential dev dependencies installed.

**Subtask 1.2: Configure TypeScript**
*   **Action:** Create `tsconfig.json` in the project root.
*   **Action:** Populate `tsconfig.json` with the specified compiler options (target ES2022, module NodeNext, strict, paths, jsx, etc.).
    ```json
    {
      "compilerOptions": {
        "target": "ES2022",
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "baseUrl": ".",
        "paths": { "@/*": ["src/*"] },
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "jsx": "react-jsx",
        "resolveJsonModule": true
      },
      "include": ["src/**/*", "tsup.config.ts", "vitest.config.ts"],
      "exclude": ["node_modules", "dist"]
    }
    ```
*   **Outcome:** TypeScript configured for the project.

**Subtask 1.3: Configure Build Tool (tsup)**
*   **Action:** Create `tsup.config.ts` in the project root.
*   **Action:** Populate `tsup.config.ts` defining entry points (`src/cli/index.ts`, `src/mcp/server.ts`), format (`esm`), dts generation, etc.
    ```typescript
    import { defineConfig } from 'tsup';

    export default defineConfig({
      entry: ['src/cli/index.ts', 'src/mcp/server.ts'],
      format: ['esm'],
      dts: true,
      splitting: false,
      sourcemap: true,
      clean: true,
      outDir: 'dist',
      tsconfig: './tsconfig.json'
    });
    ```
*   **Outcome:** Build process configured using `tsup`.

**Subtask 1.4: Configure Linting & Formatting**
*   **Action:** Create `.eslintrc.cjs` with recommended TypeScript and Prettier extensions.
    ```javascript
    // .eslintrc.cjs content as previously defined...
    module.exports = {
      root: true,
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint', 'prettier'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended'
      ],
      env: { node: true, es2022: true },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
      ignorePatterns: ['node_modules', 'dist', '.eslintrc.cjs', 'tsup.config.ts', 'vitest.config.ts'],
      rules: { 'prettier/prettier': 'warn' }
    };
    ```
*   **Action:** Create `.prettierrc.json` with desired formatting rules (singleQuote, semi, etc.).
    ```json
    // .prettierrc.json content as previously defined...
    {
      "semi": true,
      "singleQuote": true,
      "trailingComma": "es5",
      "printWidth": 80,
      "tabWidth": 2,
      "useTabs": false,
      "bracketSpacing": true,
      "arrowParens": "always"
    }
    ```
*   **Action:** Create `.prettierignore` listing files/folders to ignore.
    ```
    # .prettierignore content as previously defined...
    node_modules
    dist
    coverage
    tasks.json
    package-lock.json
    pnpm-lock.yaml
    yarn.lock
    ```
*   **Outcome:** ESLint and Prettier configured for code quality and consistency.

**Subtask 1.5: Configure Testing (Vitest)**
*   **Action:** Create `vitest.config.ts` in the project root.
*   **Action:** Populate `vitest.config.ts` enabling `tsconfigPaths`, setting environment to `node`, and configuring coverage.
    ```typescript
    import { defineConfig } from 'vitest/config';
    import tsconfigPaths from 'vite-tsconfig-paths';

    export default defineConfig({
      plugins: [tsconfigPaths()],
      test: {
        globals: true,
        environment: 'node',
        coverage: {
          provider: 'v8',
          reporter: ['text', 'json', 'html'],
          include: ['src/**/*.ts'],
          exclude: [
            'src/types/**/*.ts', 'src/**/index.ts', 'src/**/*.test.ts',
            'src/cli/components/**/*', 'node_modules', 'dist',
          ],
        },
      },
    });
    ```
*   **Outcome:** Test runner Vitest configured.

**Subtask 1.6: Define Core Types (Zod)**
*   **Action:** Create directory `src/types`.
*   **Action:** Create file `src/types/task.ts`.
*   **Action:** Define `TaskStatusSchema`, `TaskPrioritySchema`, `TaskTypeSchema`, `SubtaskSchema`, `TaskSchema`, and `TasksFileSchema` using Zod, and export inferred types.
    ```typescript
    // src/types/task.ts content as previously defined...
    import { z } from 'zod';

    export const TaskStatusSchema = z.enum(['pending', 'in-progress', 'review', 'done', 'blocked', 'cancelled']);
    export type TaskStatus = z.infer<typeof TaskStatusSchema>;

    export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
    export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

    export const TaskTypeSchema = z.enum([ 'feature', 'bug', 'chore', 'refactor', 'docs', 'test', 'setup', 'research']);
    export type TaskType = z.infer<typeof TaskTypeSchema>;

    // Define SubtaskSchema first because TaskSchema refers to it
    export const SubtaskSchema = z.object({
      id: z.string(),
      title: z.string().min(1),
      status: TaskStatusSchema.default('pending'),
      createdAt: z.string().datetime().optional(),
      updatedAt: z.string().datetime().optional(),
    });
    export type Subtask = z.infer<typeof SubtaskSchema>;

    // Now define TaskSchema
    export const TaskSchema = z.object({
      id: z.string(),
      title: z.string().min(1, 'Title cannot be empty'),
      description: z.string().optional(),
      status: TaskStatusSchema.default('pending'),
      priority: TaskPrioritySchema.default('medium'),
      type: TaskTypeSchema.default('feature'),
      complexity: z.number().int().min(1).max(10).optional(),
      dependencies: z.array(z.string()).default([]),
      acceptanceCriteria: z.array(z.string()).default([]),
      artifacts: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([]),
      subtasks: z.array(SubtaskSchema).default([]), // Reference the defined SubtaskSchema
      assignee: z.string().optional(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    });
    export type Task = z.infer<typeof TaskSchema>; // Infer Task type

    // Define TasksFileSchema
    export const TasksFileSchema = z.object({
      meta: z.object({
        schemaVersion: z.number().default(1),
        lastId: z.string().default('0'),
      }),
      tasks: z.array(TaskSchema),
    });
    export type TasksFile = z.infer<typeof TasksFileSchema>;
    ```
*   **Outcome:** Core data structures and validation defined.

**Subtask 1.7: Create Initial Directory Structure**
*   **Action:** Create directories: `src/core`, `src/core/storage`, `src/core/utils`, `src/cli`, `src/cli/commands`, `src/cli/components`, `src/cli/utils`, `src/mcp`, `src/mcp/tools`, `src/mcp/utils`, `src/common` (optional).
*   **Action:** (Optional) Add `.gitkeep` files to empty directories.
*   **Outcome:** Project folder structure established according to the architecture.

**Subtask 1.8: Configure Gitignore**
*   **Action:** Ensure `.gitignore` includes `node_modules`, `dist`, `coverage`, `tasks.json`, `.env`, logs, OS files, IDE configs, etc.
    ```
    # .gitignore content as previously defined...
    node_modules
    dist
    coverage
    tasks.json
    *.tasks.json.bak
    logs
    *.log
    pids
    *.pid
    *.seed
    *.pid.lock
    .env
    .env.*
    !.env.example
    .DS_Store
    Thumbs.db
    .vscode/
    .idea/
    /coverage/
    ```
*   **Outcome:** Git configured to ignore appropriate files.

**Subtask 1.9: Add Package Scripts**
*   **Action:** Add scripts for `build`, `dev`, `start:cli`, `start:mcp`, `typecheck`, `lint`, `lint:fix`, `format`, `test`, `test:watch`, `coverage`, `validate` to `package.json`.
    ```json
    // package.json scripts section...
    "scripts": {
      "build": "tsup",
      "dev": "tsup --watch",
      "start:cli": "node dist/cli/index.js",
      "start:mcp": "node dist/mcp/server.js",
      "typecheck": "tsc --noEmit",
      "lint": "eslint . --ext .ts,.tsx",
      "lint:fix": "eslint . --ext .ts,.tsx --fix",
      "format": "prettier --write .",
      "test": "vitest run",
      "test:watch": "vitest",
      "coverage": "vitest run --coverage",
      "validate:types": "pnpm typecheck",
      "validate": "pnpm validate:types && pnpm lint && pnpm test"
    }
    ```
*   **Outcome:** `package.json` updated with useful development scripts.

---

**Phase 1 Overall Outcome:** A fully configured TypeScript project foundation ready for implementing core logic in Phase 2.