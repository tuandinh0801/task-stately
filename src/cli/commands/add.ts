import { Command } from 'commander';
import inquirer from 'inquirer'; // Added inquirer
import { TaskManager } from '../../core/TaskManager';
// Removed Ink components: SuccessMessage, ErrorDisplay, render, React
import {
  Task,
  TaskPriority,
  TaskType,
  TaskStatus,
  TaskPrioritySchema,
  TaskTypeSchema,
  TaskStatusSchema,
} from '@/types/task';
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
  interactive?: boolean; // Added for the new flag
}

// Data structure passed to TaskManager.createTask
// This remains the same as addTaskLogic expects this structure
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
 * This function remains largely the same, as it contains the core business logic.
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
    .option('-i, --interactive', 'Add task interactively', true) // Added interactive flag
    // Title is now optional here, required only if not interactive
    .option('-t, --title <title>', 'Title of the task')
    .option('-d, --description <description>', 'Description of the task')
    .option(
      '-p, --priority <priority>',
      `Priority (choices: ${Object.values(TaskPrioritySchema.enum).join(', ')})`,
    )
    .option(
      '--type <type>',
      `Type (choices: ${Object.values(TaskTypeSchema.enum).join(', ')})`,
    )
    .option(
      '-s, --status <status>',
      `Status (choices: ${Object.values(TaskStatusSchema.enum).join(', ')})`,
    )
    .option('--tags <tags>', 'Comma-separated tags for the task')
    .option('--criteria <criteria>', 'Comma-separated acceptance criteria')
    .option('--assignee <assignee>', 'Assignee for the task')
    .action(async (options: AddTaskOptions) => {
      try {
        let taskData: AddTaskOptions;

        if (options.interactive) {
          // --- Interactive Mode ---
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'title',
              message: 'Task Title:',
              validate: (input: string) => input.trim() !== '' || 'Title cannot be empty.',
            },
            {
              type: 'editor', // Or 'input'
              name: 'description',
              message: 'Description (press Enter to launch editor, ESC to skip):',
            },
            {
              type: 'list',
              name: 'priority',
              message: 'Priority:',
              choices: Object.values(TaskPrioritySchema.enum),
              default: TaskPrioritySchema.enum.medium,
            },
            {
              type: 'list',
              name: 'type',
              message: 'Type:',
              choices: Object.values(TaskTypeSchema.enum),
              default: TaskTypeSchema.enum.feature,
            },
            {
              type: 'list',
              name: 'status',
              message: 'Status:',
              choices: Object.values(TaskStatusSchema.enum),
              default: TaskStatusSchema.enum.pending,
            },
            {
              type: 'input',
              name: 'tags',
              message: 'Tags (comma-separated):',
            },
            {
              type: 'input', // Using input for simplicity, could be editor
              name: 'criteria',
              message: 'Acceptance Criteria (comma-separated):',
            },
            {
              type: 'input',
              name: 'assignee',
              message: 'Assignee (optional):',
            },
            {
              type: 'confirm',
              name: 'confirm',
              message: 'Create task with the above details?',
              default: true,
            }
          ]);

          if (!answers.confirm) {
            console.log('Task creation cancelled.');
            return;
          }

          // Prepare data from answers, matching AddTaskOptions structure for addTaskLogic
          taskData = {
            title: answers.title,
            description: answers.description,
            priority: answers.priority,
            type: answers.type,
            status: answers.status,
            tags: answers.tags, // addTaskLogic handles splitting
            criteria: answers.criteria, // addTaskLogic handles splitting
            assignee: answers.assignee,
          };

        } else {
          // --- Non-Interactive Mode ---
          if (!options.title) {
             throw new Error('Task title is required when not using interactive mode.');
          }
          taskData = options; // Use options directly
        }

        // Call the core logic function (handles validation and creation)
        const newTask = await addTaskLogic(taskManager, taskData);
        console.log(`✅ Task "${newTask.title}" (ID: ${newTask.id}) created successfully.`);

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error adding task: ${errorMessage}`);
        // Consider more specific error handling based on error type (e.g., ZodError)
        process.exitCode = 1; // Set exit code on error
      }
    });
}