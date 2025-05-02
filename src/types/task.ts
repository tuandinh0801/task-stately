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

// --- Hierarchical Task Type ---

// Define the recursive type for use in tree building logic
export type TaskTreeNode = Task & {
  children: TaskTreeNode[];
  depth: number;
};

// Note: Removed the problematic TaskTreeNodeSchema definition.
// The buildTaskTree function will construct objects matching TaskTreeNode type.