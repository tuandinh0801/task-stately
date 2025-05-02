import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { TaskManager } from '../../core/TaskManager'; // Corrected path
import SuccessMessage from '../components/SuccessMessage'; // Corrected path
import ErrorDisplay from '../components/ErrorDisplay'; // Corrected path
import { TaskNotFoundError } from '@/types/task'; // Import error type

// --- Extracted Logic Functions ---

/**
 * Logic for adding a task dependency.
 */
export async function addDependencyLogic(
  taskManager: TaskManager,
  taskId: string,
  dependencyId: string
): Promise<void> {
  // Let TaskManager handle TaskNotFoundError etc.
  await taskManager.addTaskDependency(taskId, dependencyId);
  // No return value needed, success is indicated by not throwing
}

/**
 * Logic for removing a task dependency.
 * Assumes taskManager.removeTaskDependency returns the updated task or throws.
 */
export async function removeDependencyLogic(
  taskManager: TaskManager,
  taskId: string,
  dependencyId: string
): Promise<void> { // Return void on success
   // Let TaskManager handle TaskNotFoundError etc.
  await taskManager.removeTaskDependency(taskId, dependencyId);
  // No return needed, success is indicated by not throwing
}


// --- Command Registration ---

/**
 * Registers the dependency management commands with the program.
 * @param program - The commander program instance.
 * @param taskManager - The TaskManager instance.
 */
export async function registerDependencyCommand(
  program: Command,
  taskManager: TaskManager,
): Promise<void> {
  const depCmd = program
    .command('dependency')
    .alias('dep')
    .description('Manage task dependencies');

  // --- Add Subcommand (Uses extracted logic) ---
  depCmd
    .command('add')
    .description('Add a dependency to a task (task depends on dependency)')
    .argument('<taskId>', 'ID of the task that will depend on another')
    .argument(
      '<dependencyId>',
      'ID of the task that must be completed first',
    )
    .action(async (taskId: string, dependencyId: string) => {
      try {
        // Call extracted logic
        await addDependencyLogic(taskManager, taskId, dependencyId);
        // Render success (UI concern)
        render(
          React.createElement(SuccessMessage, {
            message: `Dependency ${dependencyId} added to task ${taskId} successfully.`,
          }),
        );
      } catch (error: any) {
        // Render error (UI concern)
         let errorMessage = 'Failed to add dependency.';
         if (error instanceof TaskNotFoundError || error instanceof Error) {
             errorMessage = error.message;
         } else {
             errorMessage = String(error);
         }
        render(React.createElement(ErrorDisplay, { error: errorMessage }));
        process.exitCode = 1;
      }
    });

  // --- Remove Subcommand (Uses extracted logic) ---
  depCmd
    .command('remove')
    .alias('rm')
    .description('Remove a dependency from a task')
    .argument('<taskId>', 'ID of the task to remove the dependency from')
    .argument('<dependencyId>', 'ID of the dependency task to remove')
    .action(async (taskId: string, dependencyId: string) => {
      try {
         // Call extracted logic (returns void on success, throws on error)
        await removeDependencyLogic(taskManager, taskId, dependencyId);

        // If removeDependencyLogic completes without throwing, it was successful.
        render(
          React.createElement(SuccessMessage, {
            message: `Dependency ${dependencyId} removed from task ${taskId} successfully.`,
          }),
        );
      } catch (error: any) {
        // Handle errors thrown by logic (e.g., TaskNotFound or if dependency didn't exist)
         let errorMessage = 'Failed to remove dependency.';
         if (error instanceof TaskNotFoundError || error instanceof Error) {
             errorMessage = error.message;
         } else {
             errorMessage = String(error);
         }
        render(React.createElement(ErrorDisplay, { error: errorMessage }));
        process.exitCode = 1;
      }
    });
}