import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { TaskManager } from '../../core/TaskManager';
import TaskDetail from '../components/TaskDetail';
import ErrorDisplay from '../components/ErrorDisplay';
import { Task, TaskNotFoundError } from '../../types/task'; // Import TaskNotFoundError

/**
 * Pure logic for fetching a single task by ID.
 * @param taskManager The TaskManager instance.
 * @param id The ID of the task to fetch.
 * @returns Promise resolving to the Task or undefined if not found.
 * @throws Rethrows any error from taskManager.getTask.
 */
export async function getShowTaskLogic(taskManager: TaskManager, id: string): Promise<Task> {
    // This function ONLY interacts with TaskManager and returns data or throws.
    // No React/Ink imports or usage here.
    if (!id || id.trim() === '') {
      throw new Error('Task ID cannot be empty.');
    }
    const task = await taskManager.getTask(id);
    if (!task) {
      // Throw a specific error matching the test expectation
      throw new Error(`Task with ID "${id}" not found.`);
      // Consider using a custom error class like TaskNotFoundError if defined and appropriate
      // throw new TaskNotFoundError(id);
    }
    return task;
}

/**
 * Action handler for the 'show' command. Responsible for calling logic,
 * handling results/errors, and preparing the React element for rendering.
 * @param taskManager - The TaskManager instance.
 * @param id - The ID of the task to show.
 * @returns A React element (TaskDetail or ErrorDisplay).
 */
export async function showAction(taskManager: TaskManager, id: string): Promise<React.ReactElement> {
  try {
    const task = await getShowTaskLogic(taskManager, id);
    // Explicitly check if task is undefined (not found)
    if (!task) {
      // Use the specific error message from original code
      return React.createElement(ErrorDisplay, { error: `Task with ID "${id}" not found.` });
    }
    // On success (task is defined), create the TaskDetail element
    return React.createElement(TaskDetail, { task });
  } catch (error) {
    // Handle unexpected errors from the logic function
    const errorToDisplay = error instanceof Error ? error : new Error(String(error));
    return React.createElement(ErrorDisplay, { error: errorToDisplay });
  }
}


/**
 * Registers the 'show' command with the program.
 * @param program - The commander program instance.
 * @param taskManager - The TaskManager instance.
 */
export function registerShowCommand( // No longer needs async
  program: Command,
  taskManager: TaskManager,
): void { // Return void
  program
    .command('show')
    .description('Show details for a specific task')
    .argument('<id>', 'ID of the task to show')
    .action(async (id: string) => {
      const element = await showAction(taskManager, id);
       // Check if the element type is ErrorDisplay to set exit code
      if (element.type === ErrorDisplay) {
         process.exitCode = 1;
      }
      render(element);
    });
}