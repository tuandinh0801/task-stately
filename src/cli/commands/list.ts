import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { TaskManager } from '../../core/TaskManager';
import TaskList from '../components/TaskList';
import ErrorDisplay from '../components/ErrorDisplay';
import { Task, TaskStatus, TaskStatusSchema } from '../../types/task'; // Import Task type and status schema
import InteractiveTaskList from '../components/InteractiveTaskList';

// Define valid sort fields
const validSortFields = ['id', 'title', 'status', 'priority', 'type', 'createdAt', 'updatedAt'] as const;
type SortField = typeof validSortFields[number];

interface ListOptions {
  status?: TaskStatus;
  sortBy?: SortField;
}

/**
 * Pure logic for fetching and potentially filtering/sorting tasks.
 * @param taskManager The TaskManager instance.
 * @param options Filtering and sorting options.
 * @returns Promise resolving to an array of tasks.
 * @throws Rethrows any error from taskManager.getAllTasks.
 */
export async function getListTasksLogic(
    taskManager: TaskManager,
    options: ListOptions = {} // Default to empty options
): Promise<Task[]> {
    let tasks = await taskManager.getAllTasks();

    // Apply filtering
    if (options.status) {
        tasks = tasks.filter(task => task.status === options.status);
    }

    // Apply sorting
    if (options.sortBy) {
        const sortBy = options.sortBy;
        tasks.sort((a, b) => {
            const valA = a[sortBy];
            const valB = b[sortBy];

            // Basic comparison, assuming string/number values for simplicity
            // More robust sorting might be needed for different types (dates, priority levels)
            if (valA === undefined && valB === undefined) return 0;
            if (valA === undefined) return 1; // Undefined values sort last
            if (valB === undefined) return -1;

            if (valA < valB) return -1;
            if (valA > valB) return 1;
            return 0;
        });
    }

    return tasks;
}


/**
 * Action handler for the 'list' command. Responsible for calling logic,
 * handling results/errors, and preparing the React element for rendering.
 * @param taskManager - The TaskManager instance.
 * @param options Filtering and sorting options.
 * @returns A React element (TaskList or ErrorDisplay).
 */
export async function listAction(
    taskManager: TaskManager,
    options: ListOptions
): Promise<React.ReactElement> {
  try {
    // Pass options to the logic function
    const tasks = await getListTasksLogic(taskManager, options);
    // Pass tasks (potentially filtered/sorted) to the component
    return React.createElement(InteractiveTaskList, { taskManager });
  } catch (error) {
    // Ensure error is an Error instance before passing to component
    const errorToDisplay = error instanceof Error ? error : new Error(String(error));
    return React.createElement(ErrorDisplay, { error: errorToDisplay });
  }
}

/**
 * Registers the 'list' command with the program.
 * @param program - The commander program instance.
 * @param taskManager - The TaskManager instance.
 */
export function registerListCommand(
  program: Command,
  taskManager: TaskManager,
): void {
  program
    .command('list')
    .alias('ls')
    .description('List all tasks, optionally filtering by status or sorting')
    .option('-s, --status <status>', `Filter by status (${TaskStatusSchema.options.join(', ')})`)
    .option('--sort-by <field>', `Sort tasks by field (${validSortFields.join(', ')})`)
    .action(async (options: ListOptions) => { // Receive options from Commander
       // Validate status option
       if (options.status && !TaskStatusSchema.safeParse(options.status).success) {
          render(React.createElement(ErrorDisplay, { error: new Error(`Invalid status value: ${options.status}. Valid statuses are: ${TaskStatusSchema.options.join(', ')}`) }));
          process.exitCode = 1;
          return;
       }
       // Validate sort option
       if (options.sortBy && !validSortFields.includes(options.sortBy)) {
          render(React.createElement(ErrorDisplay, { error: new Error(`Invalid sort field: ${options.sortBy}. Valid fields are: ${validSortFields.join(', ')}`) }));
          process.exitCode = 1;
          return;
       }

      const element = await listAction(taskManager, options); // Pass options to action
      // Check if the element type is ErrorDisplay to set exit code
      if (element.type === ErrorDisplay) {
         process.exitCode = 1;
      }
      render(element);
    });
}