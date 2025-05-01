import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { TaskManager } from '../../core/TaskManager';
import SuccessMessage from '../components/SuccessMessage';
import ErrorDisplay from '../components/ErrorDisplay';
import { TaskNotFoundError } from '../../types/task';
import DeleteConfirmation from '../components/DeleteConfirmation'; // Add standard import

/**
 * Extracted pure logic for deleting a task.
 * @param taskManager - The TaskManager instance.
 * @param id - The ID of the task to delete.
 * @returns True if the task was deleted, false otherwise.
 */
export async function deleteTaskLogic(
  taskManager: TaskManager,
  id: string,
): Promise<boolean> {
  // Directly call and return the result from taskManager
  // Let the caller handle specific error types if needed,
  // but TaskManager.deleteTask typically returns boolean or throws other errors.
  const deleted = await taskManager.deleteTask(id);
  return deleted;
}


/**
 * Registers the 'delete' command with the program.
 * @param program - The commander program instance.
 * @param taskManager - The TaskManager instance.
 */
export async function registerDeleteCommand(
  program: Command,
  taskManager: TaskManager,
): Promise<void> {
  program
    .command('delete')
    .alias('rm')
    .description('Delete a task by its ID')
    .argument('<id>', 'ID of the task to delete')
    .action(async (id: string) => {
      // Render the interactive confirmation component using the standard import
      const app = render(
        React.createElement(DeleteConfirmation, { // Ensure this uses the imported variable
          taskId: id,
          taskManager: taskManager,
          onComplete: () => {
            // Optional: Add any logic needed after confirmation component exits
            // console.log('Confirmation component finished.');
          },
        }),
      );

      // Wait for the Ink application instance to exit
      await app.waitUntilExit();
      // Exit code (0 for success, 1 for error/cancel) is handled within DeleteConfirmation
    });
}