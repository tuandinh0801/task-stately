import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { TaskManager } from '../../core/TaskManager';
import SuccessMessage from '../components/SuccessMessage';
import ErrorDisplay from '../components/ErrorDisplay';
import {
  Task,
  TaskPriority,
  TaskType,
  TaskStatus,
  TaskPrioritySchema,
  TaskTypeSchema,
  TaskStatusSchema,
} from '../../types/task';
import { z } from 'zod';

// Options received from Commander before validation/parsing
export interface AddTaskOptions {
  title: string;
  description?: string;
  priority?: string; // Raw input from CLI
  type?: string;     // Raw input from CLI
  status?: string;   // Raw input from CLI
  tags?: string;     // Comma-separated string from CLI
  criteria?: string; // Comma-separated string from CLI (or handle array if commander does)
  assignee?: string;
}

// Data structure passed to TaskManager.createTask
interface CreateTaskData {
  title: string;
  description?: string;
  priority: TaskPriority;
  type: TaskType;
  status: TaskStatus;
  tags: string[];
  acceptanceCriteria: string[];
  assignee?: string;
}


/**
 * Pure logic for creating a new task. Handles validation and data transformation.
 * @param taskManager The TaskManager instance.
 * @param options Raw options from the CLI command.
 * @returns Promise resolving to the newly created Task.
 * @throws Throws ZodError for invalid enum values or Error for other issues.
 */
export async function addTaskLogic(
  taskManager: TaskManager,
  options: AddTaskOptions,
): Promise<Task> {
  // 1. Validate required fields
  if (!options.title || options.title.trim() === '') {
    throw new Error('Task title cannot be empty.');
  }

  // 2. Validate enums using Zod schemas (provide defaults before parsing)
  const validatedPriority = TaskPrioritySchema.parse(options.priority ?? TaskPrioritySchema.enum.medium);
  const validatedType = TaskTypeSchema.parse(options.type ?? TaskTypeSchema.enum.feature);
  const validatedStatus = TaskStatusSchema.parse(options.status ?? TaskStatusSchema.enum.pending);

  // 3. Parse comma-separated strings into arrays (handle undefined/empty)
  const tagsArray = options.tags
    ? options.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    : [];
  // Assuming criteria might also be comma-separated based on test structure, adjust if needed
  const criteriaArray = options.criteria
    ? options.criteria.split(',').map(c => c.trim()).filter(Boolean)
    : [];


  // 4. Prepare data for TaskManager
  const taskData: CreateTaskData = {
    title: options.title.trim(), // Trim title
    description: options.description,
    priority: validatedPriority,
    type: validatedType,
    status: validatedStatus,
    tags: tagsArray,
    acceptanceCriteria: criteriaArray,
    assignee: options.assignee,
  };

  // 5. Call TaskManager (this might throw its own errors)
  const newTask = await taskManager.createTask(taskData);
  return newTask;
}


/**
 * Registers the 'add' command with the program.
 * @param program - The commander program instance.
 * @param taskManager - The TaskManager instance.
 */
export function registerAddCommand(
  program: Command,
  taskManager: TaskManager,
): void {
  program
    .command('add')
    .description('Add a new task')
    .requiredOption('-t, --title <title>', 'Title of the task')
    .option('-d, --description <description>', 'Description of the task')
    .option(
      '-p, --priority <priority>',
      `Priority (choices: ${Object.values(TaskPrioritySchema.enum).join(', ')})`,
      // Default handled in addTaskLogic
    )
    .option(
      '--type <type>',
      `Type (choices: ${Object.values(TaskTypeSchema.enum).join(', ')})`,
      // Default handled in addTaskLogic
    )
    .option(
      '-s, --status <status>',
      `Status (choices: ${Object.values(TaskStatusSchema.enum).join(', ')})`,
       // Default handled in addTaskLogic
    )
    // Test expects comma-separated, adjust if commander handles arrays differently
    .option('--tags <tags>', 'Comma-separated tags for the task')
    .option('--criteria <criteria>', 'Comma-separated acceptance criteria')
    .option('--assignee <assignee>', 'Assignee for the task')
    .action(async (options: AddTaskOptions) => { // Use AddTaskOptions type
      let element: React.ReactElement;
      try {
        const newTask = await addTaskLogic(taskManager, options);
        element = React.createElement(SuccessMessage, {
          message: `Task "${newTask.title}" (ID: ${newTask.id}) created successfully.`,
        });
      } catch (error: unknown) {
         const errorToDisplay = error instanceof Error ? error : new Error(String(error));
         element = React.createElement(ErrorDisplay, { error: errorToDisplay });
         process.exitCode = 1; // Set exit code on error
      }
      render(element);
    });
}