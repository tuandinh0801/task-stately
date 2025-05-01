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

// Schema for data used when updating a task (all fields optional)
export const UpdateTaskDataSchema = TaskSchema.partial();
export type UpdateTaskData = z.infer<typeof UpdateTaskDataSchema>;

// Custom Error for Task Not Found scenarios
export class TaskNotFoundError extends Error {
  constructor(id: string) {
    super(`Task with ID "${id}" not found.`);
    this.name = 'TaskNotFoundError';
  }
}

// Custom Error for Subtask Not Found scenarios
export class SubtaskNotFoundError extends Error {
  constructor(taskId: string, subtaskId: string) {
    super(`Subtask with ID "${subtaskId}" not found in task "${taskId}".`);
    this.name = 'SubtaskNotFoundError';
  }
}

// Example of a schema for the entire tasks file structure (Phase 2)
export const TasksFileSchema = z.object({
  meta: z.object({
    schemaVersion: z.number().default(1),
    lastId: z.string().default('0'), // Store last numeric ID as string if sequential
  }),
  tasks: z.array(TaskSchema),
});
export type TasksFile = z.infer<typeof TasksFileSchema>;