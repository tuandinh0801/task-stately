import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { TaskManager } from '../../core/TaskManager';
import SuccessMessage from '../components/SuccessMessage'; // Corrected import: default export
import ErrorDisplay from '../components/ErrorDisplay'; // Corrected import: default export
import {
  TaskStatusSchema,
  TaskStatus,
  Subtask,
  TaskNotFoundError, // Import necessary errors
  SubtaskNotFoundError,
} from '../../types/task';

// --- Extracted Logic Functions ---

/**
 * Logic for updating a subtask.
 */
export async function updateSubtaskLogic(
  taskManager: TaskManager,
  taskId: string,
  subtaskId: string,
  options: { title?: string; status?: string }
): Promise<Subtask> {
  const updates: Partial<Pick<Subtask, 'title' | 'status'>> = {};
  let validatedStatus: TaskStatus | undefined;

  try {
      if (options.status) {
        const statusValidation = TaskStatusSchema.safeParse(options.status);
        if (!statusValidation.success) {
          throw new Error(
            `Invalid status: ${options.status}. Must be one of: ${TaskStatusSchema.options.join(', ')}`
          );
        }
        validatedStatus = statusValidation.data as TaskStatus;
        updates.status = validatedStatus;
      }

      if (options.title) {
        updates.title = options.title;
      }
  } catch (error: any) {
     // Re-throw Zod validation errors or other parsing errors
    if (error.errors) {
       const errorMessage = `Invalid input: ${error.errors
            .map((e: any) => `${e.path.join('.')} - ${e.message}`)
            .join(', ')}`;
       throw new Error(errorMessage);
    }
    throw error; // Re-throw other unexpected errors during parsing
  }


  if (Object.keys(updates).length === 0) {
    throw new Error('No updates provided. Use -t to set title or -s to set status.');
  }

  // Let TaskManager handle TaskNotFoundError, SubtaskNotFoundError etc.
  const updatedSubtask = await taskManager.updateSubtask(
    taskId,
    subtaskId,
    updates
  );
  return updatedSubtask;
}

/**
 * Logic for removing a subtask.
 */
export async function removeSubtaskLogic(
  taskManager: TaskManager,
  taskId: string,
  subtaskId: string
): Promise<boolean> {
  // Let TaskManager handle TaskNotFoundError etc.
  const removed = await taskManager.removeSubtask(taskId, subtaskId);
  return removed;
}


// --- Command Registration ---

export async function registerSubtaskCommand(program: Command, taskManager: TaskManager) {
  const subtaskCmd = program.command('subtask').description('Manage subtasks');

  // --- Add Subcommand (Remains mostly unchanged for now) ---
  subtaskCmd
    .command('add')
    .description('Add a new subtask to a parent task')
    .argument('<taskId>', 'ID of the parent task')
    .requiredOption('-t, --title <title>', 'Title of the subtask')
    .option(
      '-s, --status <status>',
      `Initial status (${TaskStatusSchema.options.join(', ')}. Default: pending)`,
      'pending'
    )
    .action(async (taskId: string, options: { title: string; status: string }) => {
      try {
        // TODO: Extract addSubtaskLogic in a future step if needed
        const statusValidation = TaskStatusSchema.safeParse(options.status);
        if (!statusValidation.success) {
          throw new Error(
            `Invalid status: ${options.status}. Must be one of: ${TaskStatusSchema.options.join(', ')}`
          );
        }
        const validatedStatus = statusValidation.data as TaskStatus;

        const subtaskData = {
          title: options.title,
          status: validatedStatus,
        };

        const newSubtask = await taskManager.addSubtask(taskId, subtaskData);

        render(
          React.createElement(SuccessMessage, {
            message: `Subtask "${newSubtask.title}" (ID: ${newSubtask.id}) added to task ${taskId} successfully.`,
          })
        );
      } catch (error: any) {
        render(React.createElement(ErrorDisplay, { error: error.message || error }));
        process.exitCode = 1;
      }
    });

  // --- Update Subcommand (Uses extracted logic) ---
  subtaskCmd
    .command('update')
    .description('Update an existing subtask')
    .argument('<taskId>', 'ID of the parent task')
    .argument('<subtaskId>', 'ID of the subtask to update')
    .option('-t, --title <title>', 'New title for the subtask')
    .option(
      '-s, --status <status>',
      `New status (${TaskStatusSchema.options.join(', ')})`
    )
    .action(
      async (
        taskId: string,
        subtaskId: string,
        options: { title?: string; status?: string }
      ) => {
        try {
          // Call extracted logic
          const updatedSubtask = await updateSubtaskLogic(taskManager, taskId, subtaskId, options);

          // Render success (UI concern)
          render(
            React.createElement(SuccessMessage, {
              message: `Subtask "${updatedSubtask.title}" (ID: ${updatedSubtask.id}) updated successfully.`,
            })
          );
        } catch (error: any) {
          // Render error (UI concern)
          let errorMessage = 'Failed to update subtask.';
          if (error instanceof TaskNotFoundError || error instanceof SubtaskNotFoundError || error instanceof Error) {
             errorMessage = error.message;
          } else {
             errorMessage = String(error);
          }
          render(React.createElement(ErrorDisplay, { error: errorMessage }));
          process.exitCode = 1;
        }
      }
    );

  // --- Remove Subcommand (Uses extracted logic) ---
  subtaskCmd
    .command('remove')
    .alias('rm')
    .description('Remove a subtask from a parent task')
    .argument('<taskId>', 'ID of the parent task')
    .argument('<subtaskId>', 'ID of the subtask to remove')
    .action(async (taskId: string, subtaskId: string) => {
      try {
         // Call extracted logic
        const removed = await removeSubtaskLogic(taskManager, taskId, subtaskId);

        // Handle UI based on result
        if (removed) {
          render(
            React.createElement(SuccessMessage, {
              message: `Subtask "${subtaskId}" removed from task ${taskId} successfully.`,
            })
          );
        } else {
           // Logic returned false, implies subtask not found
          render(
            React.createElement(ErrorDisplay, {
              error: `Subtask "${subtaskId}" not found on task ${taskId}.`,
            })
          );
          process.exitCode = 1;
        }
      } catch (error: any) {
         // Handle errors thrown by logic (e.g., TaskNotFound)
         let errorMessage = 'Failed to remove subtask.';
         if (error instanceof TaskNotFoundError || error instanceof Error) {
             errorMessage = error.message;
         } else {
             errorMessage = String(error);
         }
        render(React.createElement(ErrorDisplay, { error: errorMessage }));
        process.exitCode = 1;
      }
    });

  // Add other subtask commands (list, etc.) here in the future
}