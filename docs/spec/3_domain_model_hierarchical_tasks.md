# Domain Model: Hierarchical Tasks

## 1. Overview

This document defines the refactored domain model for tasks within `task-stately`, transitioning from a separate `Task` and `Subtask` structure to a unified, hierarchical model. This allows for representing work items at different levels (e.g., Epic, Feature, Task, Bug) and nesting them accordingly, similar to systems like Jira.

## 2. Core Entity: Task

The core entity remains `Task`, but it's enhanced to support parent-child relationships recursively. The separate `Subtask` entity is removed.

### 2.1. Proposed `TaskSchema` (Zod)

```typescript
import { z } from 'zod';

// Enums remain the same (TaskStatusSchema, TaskPrioritySchema, TaskTypeSchema)
export const TaskStatusSchema = z.enum([
  'pending', 'in-progress', 'review', 'done', 'blocked', 'cancelled',
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

// Ensure TaskTypeSchema includes desired hierarchical levels
export const TaskTypeSchema = z.enum([
  'epic',      // High-level initiative
  'feature',   // Distinct part of functionality
  'task',      // Specific piece of work
  'bug',       // Defect correction
  'chore',     // Maintenance or operational work
  'refactor',
  'docs',
  'test',
  'setup',
  'research',
]);
export type TaskType = z.infer<typeof TaskTypeSchema>;

// Unified Task Schema
export const TaskSchema = z.object({
  // --- Core Identification ---
  id: z.string(), // Unique identifier (e.g., UUID or sequential string "1", "2")
  title: z.string().min(1, 'Title cannot be empty'),
  description: z.string().optional(),

  // --- Classification & Status ---
  status: TaskStatusSchema.default('pending'),
  priority: TaskPrioritySchema.default('medium'),
  type: TaskTypeSchema.default('task'), // Default to 'task', can be set to 'epic', 'feature', etc.
  complexity: z.number().int().min(1).max(10).optional(), // Scale 1-10
  tags: z.array(z.string()).default([]),

  // --- Relationships ---
  parentTaskId: z.string().optional().nullable(), // ID of the parent task, null if top-level
  childTaskIds: z.array(z.string()).default([]), // IDs of direct child tasks
  dependencies: z.array(z.string()).default([]), // IDs of tasks this task depends on (blocks)

  // --- Details & Metadata ---
  acceptanceCriteria: z.array(z.string()).default([]),
  artifacts: z.array(z.string()).default([]), // e.g., links to designs, PRs
  assignee: z.string().optional(), // User ID or name
  createdAt: z.string().datetime(), // ISO 8601 format
  updatedAt: z.string().datetime(), // ISO 8601 format
});
export type Task = z.infer<typeof TaskSchema>;

// --- Supporting Types ---

// Schema for data used when creating a new task (subset of Task)
// Note: id, createdAt, updatedAt, childTaskIds are usually set by the system
export const NewTaskDataSchema = TaskSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  childTaskIds: true, // Children are added via separate operations
}).partial({
  // Make fields optional where appropriate for creation
  status: true,
  priority: true,
  type: true,
  dependencies: true,
  acceptanceCriteria: true,
  artifacts: true,
  tags: true,
  parentTaskId: true, // parentTaskId can be provided during creation
});
export type NewTaskData = z.infer<typeof NewTaskDataSchema>;


// Schema for data used when updating a task (all fields optional)
export const UpdateTaskDataSchema = TaskSchema.partial().omit({
  id: true, // ID cannot be updated
  createdAt: true, // createdAt cannot be updated
});
export type UpdateTaskData = z.infer<typeof UpdateTaskDataSchema>;

// Custom Errors remain the same (TaskNotFoundError)
export class TaskNotFoundError extends Error {
  constructor(id: string) {
    super(`Task with ID "${id}" not found.`);
    this.name = 'TaskNotFoundError';
  }
}

// Schema for the entire tasks file structure (adjust if needed)
// Storing tasks as a flat array is generally simpler for lookup.
// Hierarchy is reconstructed via parentTaskId/childTaskIds.
export const TasksFileSchema = z.object({
  meta: z.object({
    schemaVersion: z.number().default(2), // Increment version
    lastTaskId: z.number().int().nonnegative().default(0), // If using sequential numeric IDs
  }),
  tasks: z.array(TaskSchema), // Flat list of all tasks
});
export type TasksFile = z.infer<typeof TasksFileSchema>;

```

### 2.2. Key Changes:

1.  **Removed `SubtaskSchema` and `Subtask` Type:** The separate definition for subtasks is eliminated.
2.  **Added `parentTaskId`:** A new optional and nullable string field `parentTaskId` is added to `TaskSchema` to link a task to its parent. `null` or `undefined` indicates a top-level task.
3.  **Replaced `subtasks` with `childTaskIds`:** The `subtasks` array (which previously held `Subtask` objects) is replaced with `childTaskIds`, an array of strings containing the IDs of the direct children of the task.
4.  **Updated `TaskTypeSchema`:** Ensured that `TaskTypeSchema` includes relevant hierarchical types like `epic` and `feature`. The default remains `task`.
5.  **Updated `NewTaskDataSchema`:** Adjusted the creation schema. `parentTaskId` can optionally be provided during creation. `childTaskIds` is omitted as children are managed through separate operations.
6.  **Updated `UpdateTaskDataSchema`:** Allows partial updates to any field except `id` and `createdAt`.
7.  **Updated `TasksFileSchema`:** Incremented `schemaVersion`. The `tasks` array remains a flat list of `Task` objects. The hierarchy is managed through the `parentTaskId` and `childTaskIds` fields within each task object.

## 3. Relationships

*   **Hierarchy:** A `Task` can have zero or one `parentTask` (via `parentTaskId`) and zero or more `childTasks` (via `childTaskIds`). This forms a tree structure.
*   **Dependencies:** A `Task` can depend on zero or more other `Tasks` (via `dependencies`). This forms a directed acyclic graph (DAG) overlayed on the hierarchy. Dependencies are independent of the parent/child structure.

## 4. Constraints & Considerations

*   **Circular Hierarchy:** Validation must be implemented (likely in `TaskManager`) to prevent a task from being its own ancestor (e.g., setting `parentTaskId` to itself or one of its descendants).
*   **Data Storage:** The `JsonFileTaskStorage` will need to be updated to read and write the modified `Task` structure. Storing tasks as a flat list simplifies lookups by ID.
*   **ID Generation:** A single, global sequential string ID strategy will be used. The `meta.lastTaskId` field in `tasks.json` will track the last used integer ID. The storage layer (`JsonFileTaskStorage`) will be responsible for:
    *   Reading `meta.lastTaskId`.
    *   Incrementing it for a new task.
    *   Assigning the incremented value as a string for the new task's `id`.
    *   Saving the updated `meta.lastTaskId`.
    *   All tasks (epics, features, tasks, bugs, etc.) share this single sequence. Example: If `lastTaskId` is 7, the next task created gets `id: "8"`, and `lastTaskId` becomes 8.
*   **Orphan Tasks vs. Cascade Delete:** The `deleteTask` operation will accept an optional flag (`cascade: boolean`). If `false` (default), children are orphaned (`parentTaskId` set to `null`). If `true`, children (and their descendants) are recursively deleted.
*   **Performance:** Fetching a task and its entire descendant tree might require recursive lookups or multiple queries, which could impact performance for deep hierarchies. Consider optimizations like storing pre-calculated descendant lists if needed, or limiting the depth of fetches by default.