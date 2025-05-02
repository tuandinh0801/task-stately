# Pseudocode: Update `list` Command Logic

## 1. Overview

This pseudocode outlines the changes needed in `src/cli/commands/list.ts` to implement the refactored `list` command behavior, including the removal of `--tree`, addition of `--with-subtasks`, and preparation of data for hierarchical table display with indentation and emojis.

## 2. File: `src/cli/commands/list.ts`

```typescript
// --- IMPORTS ---
// Import necessary modules: Command, render, React, TaskManager, TaskList, ErrorDisplay
// Import types: Task, TaskStatus, TaskStatusSchema, TaskPriority, TaskPrioritySchema
// Define or import EMOJI_MAPS for status and priority

// --- CONSTANTS ---
// Define validSortFields (as before)
// Define EMOJI_MAPS
CONSTANT STATUS_EMOJIS = {
  pending: '⏳',
  'in-progress': '🚧',
  review: '👀',
  done: '✅',
  blocked: '🚫',
  cancelled: '❌'
}
CONSTANT PRIORITY_EMOJIS = {
  low: '⬇️',
  medium: '➖',
  high: '⬆️',
  critical: '🔥'
}
CONSTANT INDENT_CHAR = '  ' // Two spaces for indentation
CONSTANT BRANCH_MID = '├─ '
CONSTANT BRANCH_END = '└─ '
CONSTANT BRANCH_NONE = '' // For top-level

// --- INTERFACES ---
// Update ListOptions interface
INTERFACE ListOptions {
  status?: TaskStatus;
  sortBy?: SortField;
  withSubtasks?: boolean; // Changed from 'tree'
}

// Define an extended Task type for rendering, including hierarchy info
INTERFACE DisplayTask EXTENDS Task {
  depth: number;
  isLastChild: boolean; // Needed for branch character
  displayId: string; // Formatted ID with indentation/branch
  statusEmoji: string;
  priorityEmoji: string;
}

// --- FUNCTIONS ---

// getListTasksLogic: Remains largely the same, fetches all tasks and applies basic filtering/sorting
// It should NOT filter based on hierarchy here, as the full list is needed for depth calculation.
FUNCTION getListTasksLogic(taskManager: TaskManager, options: ListOptions): Promise<Task[]>
  // TEST: Fetches all tasks from taskManager
  // TEST: Filters tasks correctly based on options.status
  // TEST: Sorts tasks correctly based on options.sortBy (initial sort before hierarchy processing)
  tasks = AWAIT taskManager.getAllTasks()

  IF options.status THEN
    tasks = tasks.filter(task => task.status === options.status)
  ENDIF

  IF options.sortBy THEN
    // Apply sorting logic as before
    // Note: This sort happens *before* hierarchical ordering.
    // Hierarchical ordering will take precedence later.
    tasks.sort(...)
  ENDIF

  RETURN tasks
ENDFUNCTION

// NEW HELPER: prepareDisplayTasks - Processes flat list into display-ready hierarchical list
FUNCTION prepareDisplayTasks(tasks: Task[], withSubtasks: boolean, sortBy?: SortField): DisplayTask[]
  // TEST: Returns only top-level tasks when withSubtasks is false
  // TEST: Returns all tasks in hierarchical order when withSubtasks is true
  // TEST: Calculates depth correctly for nested tasks
  // TEST: Identifies isLastChild correctly for branch characters
  // TEST: Formats displayId with correct indentation and branch characters
  // TEST: Adds correct status and priority emojis
  // TEST: Sorts sibling tasks correctly based on sortBy when withSubtasks is true

  taskMap = new Map<string, Task & { children: Task[], originalIndex: number }>()
  rootTasks: Task[] = []

  // 1. Build map and identify roots
  tasks.forEach((task, index) => {
    taskMap.set(task.id, { ...task, children: [], originalIndex: index })
  })

  tasks.forEach(task => {
    node = taskMap.get(task.id)
    IF task.parentTaskId AND taskMap.has(task.parentTaskId) THEN
      parent = taskMap.get(task.parentTaskId)
      parent.children.push(node)
    ELSE
      rootTasks.push(node) // Treat orphans or actual roots as roots
    ENDIF
  })

  // 2. Sort roots and children if sortBy is provided
  FUNCTION sortSiblings(siblings: Task[])
    IF sortBy THEN
      siblings.sort((a, b) => {
        valA = a[sortBy]
        valB = b[sortBy]
        // Comparison logic (as in getListTasksLogic)
        // ... return -1, 0, or 1
      })
    ELSE
      // Default sort (e.g., by original index or createdAt) to maintain stability
      siblings.sort((a, b) => a.originalIndex - b.originalIndex)
    ENDIF
  ENDFUNCTION

  sortSiblings(rootTasks)
  taskMap.forEach(node => sortSiblings(node.children))

  // 3. Flatten tree into display order and calculate display properties
  displayList: DisplayTask[] = []
  FUNCTION traverse(node: Task, depth: number, isLast: boolean)
    // Calculate indentation and branch
    indent = INDENT_CHAR.repeat(depth)
    branch = depth === 0 ? BRANCH_NONE : (isLast ? BRANCH_END : BRANCH_MID)
    formattedId = `${indent}${branch}${node.id}`

    // Get emojis
    statusEmoji = STATUS_EMOJIS[node.status] ?? ''
    priorityEmoji = PRIORITY_EMOJIS[node.priority] ?? ''

    // Add to display list
    displayList.push({
      ...node,
      depth: depth,
      isLastChild: isLast,
      displayId: formattedId,
      statusEmoji: statusEmoji,
      priorityEmoji: priorityEmoji
    })

    // Recursively traverse children
    node.children.forEach((child, index, arr) => {
      traverse(child, depth + 1, index === arr.length - 1)
    })
  ENDFUNCTION

  IF withSubtasks THEN
    // Traverse the tree starting from roots
    rootTasks.forEach((root, index, arr) => {
      traverse(root, 0, index === arr.length - 1)
    })
    RETURN displayList
  ELSE
    // Only process root tasks for display (no hierarchy needed)
    RETURN rootTasks.map(task => ({
      ...task,
      depth: 0,
      isLastChild: true, // Not relevant but needs a value
      displayId: task.id, // No indentation/branch
      statusEmoji: STATUS_EMOJIS[task.status] ?? '',
      priorityEmoji: PRIORITY_EMOJIS[task.priority] ?? ''
    }))
  ENDIF
ENDFUNCTION


// listAction: Updated to use prepareDisplayTasks
FUNCTION listAction(taskManager: TaskManager, options: ListOptions): Promise<React.ReactElement>
  // TEST: Calls getListTasksLogic with correct options
  // TEST: Calls prepareDisplayTasks with fetched tasks and options
  // TEST: Passes prepared display tasks to TaskList component
  // TEST: Handles errors and renders ErrorDisplay

  TRY
    // Fetch ALL tasks first, filtering/sorting applied initially
    flatTasks = AWAIT getListTasksLogic(taskManager, { status: options.status, sortBy: options.sortBy })

    // Prepare tasks for display based on withSubtasks flag
    displayTasks = prepareDisplayTasks(flatTasks, options.withSubtasks ?? false, options.sortBy)
    // TEST: Ensure displayTasks has correct structure based on withSubtasks

    // Pass the prepared list (which includes depth, displayId, emojis) to TaskList
    // TaskList no longer needs isTree flag, it just renders the data it receives.
    RETURN React.createElement(TaskList, { tasks: displayTasks })

  CATCH error
    errorToDisplay = error instanceof Error ? error : new Error(String(error))
    RETURN React.createElement(ErrorDisplay, { error: errorToDisplay })
  ENDTRY
ENDFUNCTION

// registerListCommand: Updated options
FUNCTION registerListCommand(program: Command, taskManager: TaskManager): void
  program
    .command('list')
    .alias('ls')
    .description('List tasks in a table, optionally showing subtasks') // Updated description
    .option('-s, --status <status>', `Filter by status (${TaskStatusSchema.options.join(', ')})`)
    .option('--sort-by <field>', `Sort tasks by field (${validSortFields.join(', ')})`)
    // Removed --tree option
    .option('-w, --with-subtasks', 'Display all tasks including subtasks hierarchically', false) // Added with-subtasks
    .action(async (options: ListOptions) => {
       // Validation for status and sortBy remains the same
       IF options.status AND NOT TaskStatusSchema.safeParse(options.status).success THEN
          // Render error
          RETURN
       ENDIF
       IF options.sortBy AND NOT validSortFields.includes(options.sortBy) THEN
          // Render error
          RETURN
       ENDIF

       // Call listAction with the potentially new options
       element = AWAIT listAction(taskManager, options)
       IF element.type === ErrorDisplay THEN
          process.exitCode = 1
       ENDIF
       render(element)
    })
ENDFUNCTION
```

## 3. Key Changes Summary

1.  **`ListOptions`:** Replaced `tree` with `withSubtasks`.
2.  **`DisplayTask` Interface:** Added a new interface to represent the data structure passed to the `TaskList` component, including calculated `depth`, `isLastChild`, formatted `displayId`, and `statusEmoji`/`priorityEmoji`.
3.  **`getListTasksLogic`:** Now primarily fetches and applies initial filters/sorts. Hierarchy filtering is deferred.
4.  **`prepareDisplayTasks` (New Helper):**
    *   Takes the flat task list, `withSubtasks` flag, and `sortBy` option.
    *   Builds an in-memory tree to understand relationships.
    *   Sorts siblings based on `sortBy` or a default stable sort.
    *   If `withSubtasks` is true, traverses the tree to create a flat `DisplayTask[]` list in the correct hierarchical order, calculating depth, `isLastChild`, `displayId` (with indentation/branch), and emojis.
    *   If `withSubtasks` is false, maps only the root tasks to `DisplayTask[]` without hierarchy info.
5.  **`listAction`:**
    *   Calls `getListTasksLogic` to get initially filtered/sorted tasks.
    *   Calls `prepareDisplayTasks` to get the final list ready for rendering.
    *   Passes the resulting `DisplayTask[]` to the `TaskList` component. The `isTree` prop is no longer needed.
6.  **`registerListCommand`:**
    *   Removed the `--tree` option definition.
    *   Added the `-w, --with-subtasks` option definition.
    *   Updated the command description.
7.  **Constants:** Added constants for emojis, indentation, and branch characters.

## 4. Next Steps

-   Create pseudocode for the `TaskList` component (`docs/spec/8_pseudocode_tasklist_component_updates.md`) to handle rendering the `DisplayTask[]` data, including the formatted ID and emojis.