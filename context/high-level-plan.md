**Goal:** Create a task management tool ("task-stately") with CLI (using Ink/React) and MCP interfaces, storing data initially in a single JSON file via a storage adapter pattern.

**Tech Stack Recap:**

- **Language:** TypeScript
- **Runtime:** Node.js (LTS) + PNPM
- **CLI:** Commander.js (Parsing) + Ink/React (UI Rendering)
- **MCP:** FastMCP
- **Storage:** Adapter Pattern -> Single `tasks.json` implementation
- **Build:** tsup + tsc
- **Testing:** Vitest
- **Validation:** Zod
- **Code Quality:** ESLint + Prettier

---

**Phase 1: Project Setup & Foundation (The Bare Bones)**

- **Objective:** Initialize the project, set up the build/lint/test toolchain, and define core types.
- **Steps:**
  1.  **Initialize Project:**
      - Create a new directory (`task-stately`).
      - Run `pnpm init`.
      - Create a `.gitignore` file (add `node_modules`, `dist`, `.env`, `tasks.json` initially, build artifacts).
  2.  **TypeScript Setup:**
      - Install TypeScript dependencies: `npm install -D typescript @types/node tsconfig-paths` (or yarn/pnpm equivalent). `tsconfig-paths` is useful if you use path aliases.
      - Create `tsconfig.json`. Configure essential options:
        - `target`: `ES2022` or newer.
        - `module`: `NodeNext` (for modern ESM).
        - `moduleResolution`: `NodeNext`.
        - `outDir`: `./dist`.
        - `rootDir`: `./src`.
        - `strict`: `true`.
        - `esModuleInterop`: `true`.
        - `skipLibCheck`: `true`.
        - `forceConsistentCasingInFileNames`: `true`.
        - `jsx`: `react-jsx` (for Ink/React).
        - Consider adding `baseUrl` and `paths` for cleaner imports (e.g., `@/*`: [`./src/*`]).
  3.  **Build Tool Setup:**
      - Install `tsup`: `npm install -D tsup`.
      - Configure `tsup` (optional, often works well with defaults). Create `tsup.config.ts` if needed (e.g., define entry points for CLI/MCP, specify format `esm`, enable `dts`).
      - Add build scripts to `package.json`:
        ```json
        "scripts": {
          "build": "tsup",
          "dev": "tsup --watch", // For development builds
          "typecheck": "tsc --noEmit"
        }
        ```
  4.  **Linting & Formatting:**
      - Install ESLint, Prettier, and necessary plugins/configs: `npm install -D eslint prettier eslint-config-prettier eslint-plugin-prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser`.
      - Configure ESLint (`.eslintrc.cjs` or similar). Extend recommended rules (`eslint:recommended`, `plugin:@typescript-eslint/recommended`). Integrate Prettier (`plugin:prettier/recommended`).
      - Configure Prettier (`.prettierrc.json` or similar). Define style preferences (semi, singleQuote, etc.). Create `.prettierignore`.
      - Add scripts to `package.json`:
        ```json
        "scripts": {
          // ... build scripts ...
          "lint": "eslint . --ext .ts,.tsx",
          "lint:fix": "eslint . --ext .ts,.tsx --fix",
          "format": "prettier --write ."
        }
        ```
  5.  **Testing Setup:**
      - Install Vitest: `npm install -D vitest`.
      - Create `vitest.config.ts` (optional, can configure test environment, coverage, etc.).
      - Add test script to `package.json`:
        ```json
        "scripts": {
          // ... other scripts ...
          "test": "vitest run",
          "test:watch": "vitest",
          "coverage": "vitest run --coverage"
        }
        ```
  6.  **Define Core Types:**
      - Create `src/types/task.ts`.
      - Use Zod to define the schema for your enhanced Task model (including `id`, `title`, `description`, `status` enum, `priority` enum, `type` enum suggestions, `complexity`, `dependencies`, `acceptanceCriteria`, `artifacts`, `tags`, `subtasks`, `assignee`, `createdAt`, `updatedAt`).
      - Export both the Zod schema (`TaskSchema`) and the inferred TypeScript type (`type Task = z.infer<typeof TaskSchema>`). Define `SubtaskSchema` and `Subtask` type similarly.
  7.  **Basic Project Structure:**
      - Create directories: `src/`, `src/core/`, `src/cli/`, `src/mcp/`, `src/types/`.
- **Outcome:** A fully configured TypeScript project with build, lint, and test capabilities, ready for implementing core logic. The structure and types are defined.

---

**Phase 2: Core Logic & Storage Implementation**

- **Objective:** Build the non-UI, non-network parts of the task management system, including storage interaction and business logic.
- **Steps:**
  1.  **Define Storage Interface:**
      - Create `src/core/storage/ITaskStorage.ts`.
      - Define the interface with methods like:
        - `loadTasks(): Promise<Task[]>`.
        - `saveTasks(tasks: Task[]): Promise<void>`.
        - `getTaskById(id: number): Promise<Task | undefined>`.
        - `addTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>`.
        - `updateTask(id: number, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<Task>`.
        - `deleteTask(id: number): Promise<boolean>`.
        - `getNextId(): Promise<number>`.
  2.  **Implement JSON Storage:**
      - Create `src/core/storage/JsonFileTaskStorage.ts`.
      - Implement the `ITaskStorage` interface.
      - Handle reading `tasks.json` (e.g., from project root or `.task-stately/tasks.json`). Use `fs/promises`.
      - Handle file not found (create an initial empty structure: `{ meta: { schemaVersion: 1, lastId: 0 }, tasks: [] }`).
      - Use `TaskSchema.array().parse()` (or a wrapper schema like `{ meta: ..., tasks: TaskSchema.array() }`) from Zod to validate data on load.
      - Implement saving tasks back to the file atomically (read -> modify in memory -> write entire file). Use `JSON.stringify` with indentation.
      - Implement `getNextId` (read meta, increment, save meta).
  3.  **Implement TaskManager:**
      - Create `src/core/TaskManager.ts`.
      - Constructor should accept an `ITaskStorage` instance (Dependency Injection).
      - Implement public methods corresponding to user actions (e.g., `createTask`, `findTask`, `getAllTasks`, `updateTaskStatus`, `addTaskDependency`, `removeTaskDependency`, `validateProjectDependencies`, `getNextTasksToWorkOn`, `addSubtask`, `removeSubtask`).
      - These methods use the storage adapter for persistence and contain the core business rules (e.g., validating status transitions, checking dependencies before marking `in-progress`, setting `createdAt`/`updatedAt`).
      - Use Zod schemas for validating input data where appropriate.
  4.  **Unit Testing:**
      - Write unit tests (`*.test.ts`) for `TaskManager` using Vitest.
      - _Mock_ the `ITaskStorage` interface (using `vi.mock` or manual mocks) to isolate `TaskManager` logic.
      - Write unit/integration tests for `JsonFileTaskStorage` (potentially using temporary files or `memfs`).
- **Outcome:** A testable core library capable of managing tasks via the storage adapter, completely independent of CLI or MCP.

---

**(Checkpoint: Pause here if the plan is getting too long. The next phases can be detailed upon request)**

---

**Phase 3: CLI Implementation (Ink/React)**

- **Objective:** Build the interactive command-line interface.
- **Steps:**

  1.  **Install Dependencies:** `npm install commander ink react`. `npm install -D @types/react`.
  2.  **Setup Entry Point:** Create `src/cli/index.ts` (or `src/bin/task-stately.ts`). Configure `package.json`'s `bin` field to point to the compiled output (e.g., `dist/cli/index.js`). Make the script executable (`#!/usr/bin/env node`).
  3.  **Commander Setup:** Initialize Commander. Define commands (`init`, `add`, `list`, `show`, etc.) and their options/arguments.
  4.  **Instantiate Core Logic:** Create an instance of `JsonFileTaskStorage` and `TaskManager`.
  5.  **Create Ink Components:**
      - In `src/cli/components/`, create React components using Ink:
        - `TaskList.tsx`: Renders a list/table of tasks.
        - `TaskDetail.tsx`: Renders formatted details of a single task.
        - `StatusLabel.tsx`: Component to render status with color.
        - Maybe components for `ErrorDisplay`, `SuccessMessage`, etc.
  6.  **Implement Command Actions:**
      - For each Commander command action:
        - Call `TaskManager` methods to get/modify data.
        - Use `Ink.render()` to display the appropriate React component, passing data as props.
        - Handle errors gracefully, rendering error messages via Ink.
  7.  **`init` Command:** Implement logic to create the initial `tasks.json` if it doesn't exist.
  8.  **Styling:** Use Ink's `<Text color="...">` and `<Box>` properties for layout and basic styling.
  9.  **Testing:** Write integration tests for CLI commands. Consider snapshot testing Ink output or using Ink's testing utilities.

- **Outcome:** A functional CLI allowing users to manage tasks from the terminal with a rich UI.

---

**Phase 4: MCP Server Implementation**

- **Objective:** Expose task management functionality via the Model Control Protocol.
- **Steps:**

  1.  **Install Dependencies:** `pnpm install fastmcp`.
  2.  **Setup Entry Point:** Create `src/mcp/server.ts`.
  3.  **Instantiate Core Logic:** Create instances of `JsonFileTaskStorage` and `TaskManager` (similar to CLI).
  4.  **Initialize FastMCP:** Create a `new FastMCP(...)` instance.
  5.  **Define MCP Tools:** For each core function needed (`getTask`, `listTasks`, `addTask`, `updateTask`, etc.):
      - Use `server.addTool({...})`.
      - Define `name`, `description`.
      - Define `parameters` using Zod schemas (reuse/adapt from core types).
      - Implement the `execute` function:
        - Validate parameters (FastMCP might do this automatically if Zod schema provided).
        - Call the corresponding `TaskManager` method.
        - Format the result into the expected MCP response format (often simple text or structured content).
        - Handle errors, potentially returning user-friendly error messages or throwing specific MCP errors.
  6.  **Start Server:** Call `server.start({ transportType: 'stdio' })` (or configure SSE if needed later).
  7.  **Add Script:** Add a script to `package.json` to run the MCP server (e.g., `"mcp": "node dist/mcp/server.js"`).
  8.  **Testing:** Write integration tests for the MCP server. This might involve creating an MCP client using `@modelcontextprotocol/sdk` to call the tools and assert responses.

- **Outcome:** An MCP server allowing programmatic interaction with the task management system.

---

**Phase 5: Refinement, Documentation & Packaging**

- **Objective:** Polish the application, write documentation, and prepare for distribution.
- **Steps:**

  1.  **Testing:** Improve test coverage across unit and integration tests. Add tests for edge cases.
  2.  **Error Handling:** Review and standardize error handling and reporting in both CLI and MCP.
  3.  **CLI Usability:** Refine Ink UI, command flows, and help messages.
  4.  **MCP Robustness:** Ensure MCP tools handle various inputs gracefully and return consistent responses.
  5.  **Documentation:**
      - Write `README.md`: Cover installation, CLI usage with examples for each command, MCP setup and tool reference.
      - Add TSDoc comments to public APIs/classes/interfaces.
  6.  **Packaging:**
      - Finalize `package.json` (version, description, author, license, repository, keywords).
      - Ensure the `files` array includes `dist` and necessary files, excluding source (`src`) and tests.
      - Ensure the `bin` field points correctly to the compiled CLI entry point.
      - Test the build (`npm run build`).
      - Test installation locally (`npm pack && npm install -g task-stately-*.tgz`) or via `npm link`.
  7.  **(Optional) CI/CD:** Set up GitHub Actions (or similar) to run `lint`, `typecheck`, `test`, and `build` on pushes/PRs.

- **Outcome:** A well-tested, documented, and packaged Task-stately tool ready for use or publishing.

---

This plan provides a structured approach. You can focus on one phase at a time. Let me know when you'd like to dive deeper into the details of Phase 3 (CLI) or subsequent phases!
