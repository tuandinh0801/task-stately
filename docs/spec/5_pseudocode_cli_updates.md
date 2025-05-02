# Pseudocode: CLI Updates for Hierarchical Tasks

## 1. Overview

This document outlines the necessary modifications to the `task-stately` CLI (`src/cli`) to support the unified, hierarchical task structure defined in `docs/spec/3_domain_model_hierarchical_tasks.md` and managed by the updated `TaskManager` logic in `docs/spec/4_pseudocode_task_hierarchy.md`.

## 2. General Changes

*   **Remove `subtask` Command:** The dedicated `subtask` command (`src/cli/commands/subtask.ts`) is no longer needed and should be removed. Its functionality is absorbed into `add` (by specifying `--parentId`) and `update` (by changing `parentTaskId`). The registration in `src/cli/index.ts` must also be removed.
*   **Update Type Imports:** Ensure all commands and components import the updated `Task`, `NewTaskData`, and `UpdateTaskData` types from `@/types/task`.

## 3. Command-Specific Updates (`src/cli/commands/`)

### 3.1. `add.ts` (RegisterAddCommand)

*   **Add `--parentId` Option:** Introduce an optional `--parentId <id>` flag to specify the parent task when creating a new task.
    *   If provided, pass `parentId` in the `NewTaskData` object to `taskManager.createTask`.
    *   Validation: Commander can handle basic presence, but `TaskManager` will validate if the parent ID actually exists.
    *   Interactive Mode: Prompt the user if they want to assign a parent task. If yes, prompt for the parent ID.
*   **Remove Subtask Logic:** Any logic related to creating specific "subtask" types is removed. The `type` field (e.g., 'task', 'feature') determines the nature of the item.

```typescript
// PSEUDOCODE for registerAddCommand action handler

FUNCTION handleAddAction(options):
    taskData: NewTaskData = {
        title: options.title,
        description: options.description,
        // ... other options like priority, type, complexity, tags etc.
        parentTaskId: options.parentId // NEW: Pass parentId if provided
    }

    // Handle interactive mode to potentially prompt for parentId and other fields

    TRY
        createdTask = AWAIT taskManager.createTask(taskData)
        // Render success message with createdTask details
        // TEST: `add --parentId <validId>` successfully creates a child task
        // TEST: `add --parentId <invalidId>` results in TaskNotFoundError from TaskManager, rendered by CLI
        // TEST: `add` without --parentId creates a top-level task (parentTaskId is null/undefined)
    CATCH error
        // Render error message
```

### 3.2. `update.ts` (RegisterUpdateCommand)

*   **Add `--parentId` Option:** Introduce an optional `--parentId <id>` flag to allow changing the parent of a task (re-parenting).
    *   Allow a special value (e.g., `null`, `none`, `root`) or omitting the value after the flag to indicate making the task top-level (`parentTaskId: null`).
    *   If provided, include `parentTaskId` in the `UpdateTaskData` object passed to `taskManager.updateTask`.
    *   `TaskManager` handles validation (parent existence, circular checks) and updating child lists.
    *   Interactive Mode: Prompt if the user wants to change the parent. If yes, prompt for the new parent ID or option to make it top-level.

```typescript
// PSEUDOCODE for registerUpdateCommand action handler

FUNCTION handleUpdateAction(taskId, options):
    updates: UpdateTaskData = {
        title: options.title,
        description: options.description,
        status: options.status,
        // ... other update options
    }

    // Handle parentId option specifically
    IF options.parentId IS DEFINED:
        IF options.parentId === 'null' OR options.parentId === 'none' OR options.parentId === 'root': // Or similar convention
             updates.parentTaskId = null
        ELSE:
             updates.parentTaskId = options.parentId
    // TEST: `update <id> --parentId <newParentId>` calls taskManager.updateTask with correct parentId
    // TEST: `update <id> --parentId null` calls taskManager.updateTask with parentTaskId: null
    // TEST: `update <id> --parentId <invalidId>` results in error from TaskManager, rendered by CLI
    // TEST: `update <id> --parentId <circularId>` results in error from TaskManager, rendered by CLI

    // Handle interactive mode to potentially prompt for parentId change

    TRY
        updatedTask = AWAIT taskManager.updateTask(taskId, updates)
        // Render success message with updatedTask details
    CATCH error
        // Render error message
```

### 3.3. `delete.ts` (RegisterDeleteCommand)

*   **Add `--cascade` Flag:** Introduce an optional boolean `--cascade` flag.
    *   If present, call `taskManager.deleteTask(taskId, true)`.
    *   If absent, call `taskManager.deleteTask(taskId, false)` (or just `taskManager.deleteTask(taskId)` if the default is `false`).
    *   Confirmation Prompt: Consider adjusting the confirmation prompt to mention cascade deletion if the flag is used (e.g., "Are you sure you want to delete task <id> AND all its descendants?").

```typescript
// PSEUDOCODE for registerDeleteCommand action handler

FUNCTION handleDeleteAction(taskId, options):
    cascadeDelete = options.cascade || false // Default to false

    // Confirmation prompt (potentially mentioning cascade)
    confirmed = AWAIT promptUserConfirmation(...)

    IF confirmed:
        TRY
            success = AWAIT taskManager.deleteTask(taskId, cascadeDelete)
            IF success:
                // Render success message (mentioning cascade if applicable)
            ELSE:
                // Render message indicating task not found (if deleteTask returns false)
            // TEST: `delete <id>` calls taskManager.deleteTask(id, false)
            // TEST: `delete <id> --cascade` calls taskManager.deleteTask(id, true)
            // TEST: Confirmation prompt reflects cascade option
        CATCH error
            // Render error message (e.g., if TaskManager throws)
```

### 3.4. `list.ts` (RegisterListCommand)

*   **Display Hierarchy (Optional but Recommended):**
    *   Fetch all tasks: `tasks = AWAIT taskManager.getAllTasks()`.
    *   **Option 1 (Simple):** Add `Parent` and `Children` columns showing IDs.
    *   **Option 2 (Tree View):** Process the flat list into a tree structure in the CLI command logic before passing it to the `TaskList` component. This requires building a map of tasks by ID and recursively arranging them. The `TaskList` component would then need to render this tree, likely using indentation. Add a `--tree` flag to enable this view.
    *   Filtering/Sorting: Ensure filtering and sorting still work, potentially applying them before building the tree structure.

```typescript
// PSEUDOCODE for registerListCommand action handler

FUNCTION handleListAction(options):
    allTasks = AWAIT taskManager.getAllTasks()
    filteredTasks = applyFilters(allTasks, options.status, options.priority, etc.) // Existing filter logic

    IF options.tree:
        // Build tree structure from filteredTasks
        taskTree = buildTaskTree(filteredTasks)
        // Render TaskList component with taskTree and tree=true prop
        // TEST: `list --tree` renders tasks with indentation based on parent/child relationships
    ELSE:
        // Render TaskList component with flat filteredTasks list
        // TEST: `list` (default) renders a flat list (potentially with Parent/Children ID columns)

    // Helper function to build tree (simplified)
    FUNCTION buildTaskTree(tasks):
        taskMap = map tasks by id
        rootTasks = []
        FOR task IN tasks:
            IF task.parentTaskId AND taskMap[task.parentTaskId]:
                parent = taskMap[task.parentTaskId]
                parent.children = parent.children || []
                parent.children.push(task)
            ELSE:
                rootTasks.push(task)
        RETURN rootTasks
```

### 3.5. `show.ts` (RegisterShowCommand)

*   **Display Parent/Children:**
    *   Fetch the task: `task = AWAIT taskManager.getTask(taskId)`.
    *   In the `TaskDetail` component, display:
        *   Parent Task ID (if `parentTaskId` exists).
        *   List of Direct Child Task IDs (from `childTaskIds`).
    *   Consider adding an option (`--tree` or `--recursive`) to fetch and display descendants using `taskManager.getTaskWithChildren` (if implemented) or by recursively fetching in the CLI.

```typescript
// PSEUDOCODE for registerShowCommand action handler

FUNCTION handleShowAction(taskId, options):
    task = AWAIT taskManager.getTask(taskId)
    IF task IS NULL:
        // Render "Task not found" message
        RETURN

    // Potentially fetch children/tree if options.tree is set
    // displayData = options.tree ? AWAIT taskManager.getTaskWithChildren(taskId, depth) : task

    // Render TaskDetail component with task data
    // TEST: `show <id>` displays parentTaskId and childTaskIds if they exist
    // TEST: `show <id> --tree` (optional) displays nested children
```

### 3.6. `dependency.ts` (RegisterDependencyCommand)

*   No major changes expected, as dependency logic is separate from hierarchy. Ensure it continues to work with the updated `TaskManager` methods.

### 3.7. `init.ts` (RegisterInitCommand)

*   No changes expected.

## 4. Component Updates (`src/cli/components/`)

### 4.1. `TaskList.tsx`

*   **Props:** May need to accept `tasks` as either a flat array `Task[]` or a nested tree structure `TaskWithChildren[]`. Add a `treeView: boolean` prop.
*   **Rendering:**
    *   If `treeView` is false: Render as a flat table. Consider adding `Parent ID` and `Children IDs` columns.
    *   If `treeView` is true: Implement recursive rendering logic to display tasks with indentation based on their level in the tree. Use libraries like `ink-tree-view` or implement custom indentation logic.

### 4.2. `TaskDetail.tsx`

*   **Display:** Add sections or fields to display:
    *   `Parent Task: <parentTaskId>` (link or just ID)
    *   `Child Tasks: <childTaskId1>, <childTaskId2>, ...` (list of IDs)
*   If supporting recursive display (`--tree` in `show`), the component needs to handle rendering nested task details.

## 5. Index Update (`src/cli/index.ts`)

*   Remove the line `await registerSubtaskCommand(program, taskManager);`.

## 6. TDD Anchors

*   Add specific `// TEST:` comments within the pseudocode for each command modification, covering:
    *   Correct `TaskManager` method calls with appropriate arguments (`parentId`, `cascade`).
    *   Handling of new options (`--parentId`, `--cascade`, `--tree`).
    *   Error handling for invalid parent IDs or circular references.
    *   Correct rendering output for list/show commands (flat vs. tree).
    *   Removal of subtask command functionality.