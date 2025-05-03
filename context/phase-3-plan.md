# Task-Stately: Phase 3 Detailed Plan: CLI Implementation (Ink/React)

**Goal:** Build the interactive command-line interface using Commander.js for command parsing and Ink/React for rendering the UI in the terminal. This interface will interact with the `TaskManager` from Phase 2.

**Prerequisites:**

- Phase 1 (Project Setup & Foundation) is complete.
- Phase 2 (Core Logic & Storage Implementation) is complete (`TaskManager`, `JsonFileTaskStorage`, `ITaskStorage` exist and are tested).
- Core types (`Task`, `Subtask`, etc.) are defined in `src/types/task.ts`.
- Directory structure (`src/cli`, `src/cli/commands`, `src/cli/components`, etc.) exists.

---

## Detailed Steps & Rationale

**1. Install Dependencies:**

- **Action:** Install necessary runtime dependencies: `commander`, `ink`, `react`.
  ```bash
  pnpm add commander ink react
  ```
- **Action:** Install necessary development dependency for React types: `@types/react`.
  ```bash
  pnpm add -D @types/react
  ```
- **Rationale:** Adds the command-line argument parser (`commander`), the React renderer for CLIs (`ink`), React itself, and its type definitions.

**2. Setup CLI Entry Point (`src/cli/index.ts`):**

- **Action:** Verify/Create `src/cli/index.ts`.
- **Action:** Add the shebang `#!/usr/bin/env node` at the very top of `src/cli/index.ts` to make it executable.
- **Action:** Import `program` from `commander`, `render` from `ink`, `React` from `react`, `TaskManager` from `@/core/TaskManager`, and `JsonFileTaskStorage` from `@/core/storage/JsonFileTaskStorage`.
- **Action:** Instantiate core logic:
  ```typescript
  const storage = new JsonFileTaskStorage(); // Uses default 'tasks.json' path
  // Optional: Initialize storage if needed (e.g., ensure directory exists)
  // await storage.initialize?.();
  const taskManager = new TaskManager(storage);
  ```
- **Action:** Set up the main Commander program instance (version, description).
- **Action:** Define the structure for adding commands (this will be populated in step 6).
- **Action:** Add the final `program.parse(process.argv);` call.
- **Rationale:** Establishes the main executable file for the CLI, initializes the connection to the core logic, and sets up the command parser.

**3. Configure `package.json` for Executable:**

- **Action:** Add or update the `bin` field in `package.json` to map the command name (e.g., `task-stately`) to the compiled entry point.
  ```json
  {
    "name": "task-stately",
    "version": "...",
    "bin": {
      "task-stately": "./dist/cli/index.js"
    }
    // ... rest of package.json
  }
  ```
- **Action:** Ensure the `files` array in `package.json` includes `"dist"` so the compiled code is published.
  ```json
  {
    // ...
    "files": [
      "dist",
      "README.md",
      "LICENSE"
      // Add other necessary files like templates if any
    ]
    // ...
  }
  ```
- **Rationale:** Makes the CLI installable and executable globally (via `npm install -g` or `pnpm link`) by telling NPM/PNPM where the main script is located after compilation. Includes compiled output in published package.

**4. Create Core Ink Components (`src/cli/components/`):**

- **Action:** Create `src/cli/components/TaskList.tsx`:
  - Accepts `tasks: Task[]` as props.
  - Uses Ink's `<Box>`, `<Text>`, etc. to render a formatted list or table (consider using `ink-table` if complex).
  - Display key task info (ID, Title, Status, Priority). Use `StatusLabel` component.
- **Action:** Create `src/cli/components/TaskDetail.tsx`:
  - Accepts `task: Task` as props.
  - Renders detailed information about a single task, including description, dependencies, subtasks, metadata, etc. Use `<Box>` for layout and `<Text>` for labels and values.
- **Action:** Create `src/cli/components/StatusLabel.tsx`:
  - Accepts `status: TaskStatus` as props.
  - Uses `<Text>` with different colors based on the status value (e.g., green for 'done', yellow for 'in-progress', red for 'blocked').
- **Action:** Create `src/cli/components/ErrorDisplay.tsx`:
  - Accepts `error: Error | string` as props.
  - Renders the error message prominently, perhaps using red text.
- **Action:** Create `src/cli/components/SuccessMessage.tsx`:
  - Accepts `message: string` as props.
  - Renders a success message, perhaps using green text.
- **Rationale:** Creates reusable UI components for presenting task data and feedback in the terminal, separating presentation logic from command logic.

**5. Implement Commander Commands (`src/cli/commands/`):**

- **Action:** Create files for each command (e.g., `src/cli/commands/list.ts`, `add.ts`, `show.ts`, `update.ts`, `delete.ts`, `init.ts`).
- **Action:** In each command file:
  - Define a function (e.g., `registerListCommand(program: Command, taskManager: TaskManager)`) that takes the Commander `program` instance and the `taskManager` instance.
  - Inside the function, use `program.command('command-name')` to define the command, its aliases (`.alias()`), description (`.description()`), options (`.option()`), arguments (`.argument()`), and the action handler (`.action(async (...) => { ... })`).
- **Action:** In the `.action()` handler for each command:
  - Parse arguments and options provided by Commander.
  - Call the appropriate `taskManager` method(s).
  - Use a `try...catch` block for error handling.
  - On success, use `render(<SuccessMessage message="..." />)` or `render(<TaskList tasks={...} />)` or `render(<TaskDetail task={...} />)`.
  - On error, use `render(<ErrorDisplay error={error} />)` and potentially set `process.exitCode = 1`.
- **Action:** Specific Command Logic:
  - `list`: Call `taskManager.getAllTasks()`, render `TaskList`. Add options for filtering/sorting.
  - `show <id>`: Call `taskManager.getTask(id)`, render `TaskDetail` or error if not found.
  - `add`: Define options for `--title`, `--description`, `--priority`, etc. Call `taskManager.createTask()`, render `SuccessMessage` with new task ID.
  - `update <id>`: Define options for fields to update. Call `taskManager.updateTask()`, render `SuccessMessage`.
  - `delete <id>`: Call `taskManager.deleteTask()`, render `SuccessMessage`.
  - `init`: Check if `tasks.json` exists. If not, potentially call `storage.initialize()` or manually write an empty `TasksFile` structure using `JsonFileTaskStorage` methods (e.g., call `saveTasks([])` which should trigger the default file creation in `_readDataFile`). Render `SuccessMessage`.
- **Rationale:** Defines the structure and logic for each user-facing CLI command, connecting Commander's parsing with TaskManager's core functions and Ink's rendering.

**6. Integrate Commands into Entry Point (`src/cli/index.ts`):**

- **Action:** In `src/cli/index.ts`, import all `register...Command` functions from the `src/cli/commands/` directory.
- **Action:** Call each `register...Command` function, passing the `program` instance and the `taskManager` instance.

  ```typescript
  // src/cli/index.ts
  import { program } from 'commander';
  import React from 'react';
  import { render } from 'ink';
  import { TaskManager } from '@/core/TaskManager';
  import { JsonFileTaskStorage } from '@/core/storage/JsonFileTaskStorage';
  import { registerListCommand } from './commands/list';
  import { registerShowCommand } from './commands/show';
  import { registerAddCommand } from './commands/add';
  // ... import other command registration functions

  async function run() {
    const storage = new JsonFileTaskStorage();
    // await storage.initialize?.(); // Optional: Ensure storage is ready
    const taskManager = new TaskManager(storage);

    program
      .name('task-stately')
      .description('CLI tool for managing tasks')
      .version('0.1.0'); // TODO: Get version from package.json

    // Register all commands
    registerListCommand(program, taskManager);
    registerShowCommand(program, taskManager);
    registerAddCommand(program, taskManager);
    // ... register other commands

    await program.parseAsync(process.argv);
  }

  run().catch((error) => {
    // Fallback error rendering if command action fails catastrophically
    render(
      React.createElement(ErrorDisplay, {
        error: error.message || 'An unexpected error occurred.',
      })
    );
    process.exitCode = 1;
  });
  ```

- **Rationale:** Connects the defined commands to the main Commander program instance so they are available to the user. Includes top-level error handling.

**7. Styling & Usability:**

- **Action:** Refine Ink components using `<Box>` properties (padding, margin, flexDirection, etc.) for better layout.
- **Action:** Use `<Text>` properties (color, bold, italic) for emphasis and clarity.
- **Action:** Ensure consistent feedback messages (success, error).
- **Action:** Improve command descriptions and option help text in Commander setup.
- **Rationale:** Enhances the user experience of the CLI, making it more readable and intuitive.

**8. Testing:**

- **Action:** Write integration tests for CLI commands (`src/cli/commands/*.test.ts` or a dedicated `src/cli/tests/` dir).
- **Action:** Use techniques like:
  - Mocking `TaskManager` to test command parsing and rendering logic in isolation.
  - Running the actual CLI command as a child process (`execa` or similar) and asserting stdout/stderr (potentially using snapshot testing via Vitest).
  - Using Ink's testing utilities (`@testing-library/react` with Ink context, or `ink-testing-library`) if finer-grained component testing is desired.
- **Rationale:** Verifies that the CLI commands parse arguments correctly, interact with the core logic as expected, and render the appropriate output or errors.

---

## Visual Plan (Mermaid)

```mermaid
graph TD
    subgraph Phase 3: CLI Implementation
        P3_Start((Start Phase 3)) --> P3_S1(1. Install Deps);
        P3_S1 --> P3_S2(2. Setup Entry Point);
        P3_S1 --> P3_S4(4. Create Ink Components);
        P3_S2 --> P3_S3(3. Config package.json bin);
        P3_S2 --> P3_S5(5. Implement Commander Cmds);
        P3_S4 --> P3_S5; # Components used by Commands
        P3_S5 --> P3_S6(6. Integrate Cmds in Entry Point);
        P3_S6 --> P3_S7(7. Styling & Usability);
        P3_S7 --> P3_S8(8. Write CLI Tests);
        P3_S8 --> P3_End((End Phase 3));

        subgraph P3_S4_Sub [Ink Components]
            CompList(TaskList)
            CompDetail(TaskDetail)
            CompStatus(StatusLabel)
            CompError(ErrorDisplay)
            CompSuccess(SuccessMessage)
        end

        subgraph P3_S5_Sub [Commander Commands]
            CmdInit(init)
            CmdList(list)
            CmdShow(show)
            CmdAdd(add)
            CmdUpdate(update)
            CmdDelete(delete)
            CmdSubtask(subtask add/update/rm?)
            CmdDep(dep add/rm?)
        end

        P3_S4_Sub --> P3_S5_Sub; # Commands use Components for rendering

    end

    style P3_S1 fill:#f9f,stroke:#333,stroke-width:2px
    style P3_S2 fill:#ccf,stroke:#333,stroke-width:2px
    style P3_S4 fill:#cfc,stroke:#333,stroke-width:2px
    style P3_S5 fill:#cff,stroke:#333,stroke-width:2px
    style P3_S8 fill:#ffc,stroke:#333,stroke-width:2px
```

---

## Actionable Subtasks

**Subtask 3.1: Install CLI Dependencies**

- **Action:** Run `pnpm add commander ink react`.
- **Action:** Run `pnpm add -D @types/react`.
- **Outcome:** Required libraries for CLI added.

**Subtask 3.2: Setup CLI Entry Point (`src/cli/index.ts`)**

- **Action:** Create/Verify `src/cli/index.ts`. Add shebang.
- **Action:** Import dependencies (`commander`, `ink`, `react`, `TaskManager`, `JsonFileTaskStorage`).
- **Action:** Instantiate `JsonFileTaskStorage` and `TaskManager`.
- **Action:** Initialize `commander` program instance. Add top-level `run` function and `parseAsync` call with error handling.
- **Outcome:** Basic CLI entry point structure ready.

**Subtask 3.3: Configure `package.json` Executable**

- **Action:** Add/Update `bin` field in `package.json` (e.g., `"task-stately": "./dist/cli/index.js"`).
- **Action:** Ensure `files` array includes `"dist"`.
- **Outcome:** Project configured to be executable after build.

**Subtask 3.4: Create Core Ink Components**

- **Action:** Implement `TaskList.tsx`, `TaskDetail.tsx`, `StatusLabel.tsx`, `ErrorDisplay.tsx`, `SuccessMessage.tsx` in `src/cli/components/`.
- **Outcome:** Reusable UI components created.

**Subtask 3.5: Implement `init` Command**

- **Action:** Create `src/cli/commands/init.ts`.
- **Action:** Define `registerInitCommand` function.
- **Action:** Implement command logic using `storage.initialize()` or `taskManager.getAllTasks()` (to trigger potential file creation) and render `SuccessMessage`.
- **Outcome:** `init` command implemented.

**Subtask 3.6: Implement `list` Command**

- **Action:** Create `src/cli/commands/list.ts`.
- **Action:** Define `registerListCommand` function.
- **Action:** Implement command logic calling `taskManager.getAllTasks()` and rendering `TaskList`. Add options for filtering/sorting.
- **Outcome:** `list` command implemented.

**Subtask 3.7: Implement `show` Command**

- **Action:** Create `src/cli/commands/show.ts`.
- **Action:** Define `registerShowCommand` function with `<id>` argument.
- **Action:** Implement command logic calling `taskManager.getTask(id)` and rendering `TaskDetail` or `ErrorDisplay`.
- **Outcome:** `show` command implemented.

**Subtask 3.8: Implement `add` Command**

- **Action:** Create `src/cli/commands/add.ts`.
- **Action:** Define `registerAddCommand` function with options for task properties.
- **Action:** Implement command logic calling `taskManager.createTask()` and rendering `SuccessMessage`.
- **Outcome:** `add` command implemented.

**Subtask 3.9: Implement `update` Command**

- **Action:** Create `src/cli/commands/update.ts`.
- **Action:** Define `registerUpdateCommand` function with `<id>` argument and options for updatable properties.
- **Action:** Implement command logic calling `taskManager.updateTask()` and rendering `SuccessMessage`.
- **Outcome:** `update` command implemented.

**Subtask 3.10: Implement `delete` Command**

- **Action:** Create `src/cli/commands/delete.ts`.
- **Action:** Define `registerDeleteCommand` function with `<id>` argument.
- **Action:** Implement command logic calling `taskManager.deleteTask()` and rendering `SuccessMessage`.
- **Outcome:** `delete` command implemented.

**Subtask 3.11: (Optional) Implement Subtask/Dependency Commands**

- **Action:** Create command files (e.g., `subtask.ts`, `dependency.ts`).
- **Action:** Define subcommands (e.g., `task-stately subtask add <taskId> --title "..."`, `task-stately dep add <taskId> <depId>`).
- **Action:** Implement logic calling `taskManager.addSubtask`, `removeSubtask`, `addTaskDependency`, `removeTaskDependency`.
- **Outcome:** Subtask and dependency management commands implemented.

**Subtask 3.12: Integrate Commands in Entry Point**

- **Action:** Import all `register...Command` functions into `src/cli/index.ts`.
- **Action:** Call each registration function, passing `program` and `taskManager`.
- **Outcome:** All defined commands are registered and available.

**Subtask 3.13: Refine Styling & Usability**

- **Action:** Review and enhance Ink component layouts and text formatting.
- **Action:** Improve command descriptions and option help text.
- **Outcome:** CLI user experience improved.

**Subtask 3.14: Write CLI Integration Tests**

- **Action:** Create test files for commands.
- **Action:** Implement tests using mocking or child process execution.
- **Outcome:** CLI commands are verified.

---

**Phase 3 Overall Outcome:** A functional CLI allowing users to manage tasks (add, list, show, update, delete, init, potentially subtasks/dependencies) from the terminal, with a rich UI rendered using Ink/React.
