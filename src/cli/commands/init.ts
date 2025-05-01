import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { TaskManager } from '@/core/TaskManager'; // Use path alias
import SuccessMessage from '../components/SuccessMessage';
import ErrorDisplay from '../components/ErrorDisplay';

/**
 * Extracted pure logic for initializing the task storage.
 * This is achieved by attempting to read tasks, which triggers
 * storage initialization within the TaskManager if needed.
 *
 * @param taskManager - The TaskManager instance.
 */
export async function initLogic(taskManager: TaskManager): Promise<void> {
  // Attempting to read tasks triggers storage initialization implicitly
  await taskManager.getAllTasks();
  // No return value needed, success is indicated by not throwing
}


/**
 * Registers the 'init' command with the program.
 * This command initializes the task storage, ensuring the storage file exists.
 *
 * @param program - The commander program instance.
 * @param taskManager - The TaskManager instance for interacting with tasks.
 */
export async function registerInitCommand(
  program: Command,
  taskManager: TaskManager,
): Promise<void> {
  program
    .command('init')
    .description(
      'Initialize task storage (e.g., create tasks.json if it doesn\'t exist)',
    )
    .action(async () => {
      try {
        // Call the extracted logic function
        await initLogic(taskManager);

        // Render success message (UI concern)
        render(
          React.createElement(SuccessMessage, {
            message: 'Task storage initialized successfully.',
          }),
        );
      } catch (error) {
         // Render error message (UI concern)
        render(React.createElement(ErrorDisplay, { error: error as Error }));
        process.exitCode = 1;
      }
    });
}