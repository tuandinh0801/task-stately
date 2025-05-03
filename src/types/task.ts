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
  'epic', // High-level initiative
  'feature', // Distinct part of functionality
  'task', // Specific piece of work
  'bug', // Defect correction
  'chore', // Maintenance or operational work
  'refactor',
  'docs',
  'test',
  'setup',
  'research',
]);
export type TaskType = z.infer<typeof TaskTypeSchema>;

// --- Recursive Schemas ---

// Base schema for task data used in creation, excluding recursive children
const BaseNewTaskDataSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
  description: z.string().optional(),
  status: TaskStatusSchema.optional(), // Made optional for creation, defaults handled later
  priority: TaskPrioritySchema.optional(),
  type: TaskTypeSchema.optional(),
  complexity: z.number().int().min(1).max(10).optional(),
  tags: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  artifacts: z.array(z.string()).optional(),
  assignee: z.string().optional(),
  parentTaskId: z.string().optional().nullable(), // Can be provided during creation
});

// Define the structure for an inline child task during creation
// It needs a tempId and its own taskData (which could have further children)
export type InlineChildInput = {
  tempId: string;
  taskData: z.infer<typeof LazyNewTaskDataSchema>; // Use the lazy schema here
};

export const InlineChildInputSchema: z.ZodType<InlineChildInput> = z.lazy(() =>
  z.object({
    tempId: z.string().min(1),
    taskData: LazyNewTaskDataSchema, // Recursive reference
  })
);

// Lazy schema for NewTaskData including the recursive children definition
const LazyNewTaskDataSchema = BaseNewTaskDataSchema.extend({
  children: z.array(InlineChildInputSchema).optional(),
});

// Final exported schema and type for creating new tasks
export const NewTaskDataSchema = LazyNewTaskDataSchema;
export type NewTaskData = z.infer<typeof NewTaskDataSchema>;

// --- Main Task Schema ---

// Define the main Task schema using the final NewTaskData parts
export const TaskSchema = BaseNewTaskDataSchema.extend({
  // --- Core Identification ---
  id: z.string(), // Unique identifier

  // --- Classification & Status (with defaults) ---
  status: TaskStatusSchema.default('pending'),
  priority: TaskPrioritySchema.default('medium'),
  type: TaskTypeSchema.default('task'),
  tags: z.array(z.string()).default([]),

  // --- Relationships (with defaults) ---
  // parentTaskId is already in BaseNewTaskDataSchema
  childTaskIds: z.array(z.string()).default([]), // IDs of direct child tasks
  dependencies: z.array(z.string()).default([]), // IDs of tasks this task depends on
  acceptanceCriteria: z.array(z.string()).default([]),
  artifacts: z.array(z.string()).default([]),

  // --- Details & Metadata ---
  createdAt: z.string().datetime(), // ISO 8601 format
  updatedAt: z.string().datetime(), // ISO 8601 format
});
export type Task = z.infer<typeof TaskSchema>;

// --- Supporting Types ---

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

// Schema for inline child creation (re-used from addTask)
// Omitting parentTaskId as it will be determined during execution
// This is now effectively covered by InlineChildInputSchema and NewTaskDataSchema
// export const InlineChildTaskDataSchema = NewTaskDataSchema.omit({ parentTaskId: true });
