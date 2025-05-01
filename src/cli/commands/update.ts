import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { TaskManager } from '../../core/TaskManager';
import SuccessMessage from '../components/SuccessMessage'; // Default import
import ErrorDisplay from '../components/ErrorDisplay'; // Default import
import {
  TaskPrioritySchema,
  TaskStatusSchema,
  TaskTypeSchema,
  UpdateTaskData,
  TaskNotFoundError,
  Task, // Import Task type
} from '../../types/task';

// Extracted pure logic for updating a task
export async function updateTaskLogic(
  taskManager: TaskManager,
  id: string,
  options: {
    title?: string;
    description?: string;
    priority?: string;
    type?: string;
    status?: string;
    tags?: string[];
    criteria?: string[];
    assignee?: string;
  },
): Promise<Task> {
  const updateData: UpdateTaskData = {};
  let optionsProvided = false;

  // Use try...catch block for Zod parsing errors
  try {
    if (options.title !== undefined) {
      updateData.title = options.title;
      optionsProvided = true;
    }
    if (options.description !== undefined) {
      updateData.description = options.description;
      optionsProvided = true;
    }
    if (options.priority !== undefined) {
      updateData.priority = TaskPrioritySchema.parse(options.priority);
      optionsProvided = true;
    }
    if (options.type !== undefined) {
      updateData.type = TaskTypeSchema.parse(options.type);
      optionsProvided = true;
    }
    if (options.status !== undefined) {
      updateData.status = TaskStatusSchema.parse(options.status);
      optionsProvided = true;
    }
    if (options.tags !== undefined) {
      updateData.tags = options.tags;
      optionsProvided = true;
    }
    if (options.criteria !== undefined) {
      updateData.acceptanceCriteria = options.criteria;
      optionsProvided = true;
    }
    if (options.assignee !== undefined) {
      updateData.assignee = options.assignee;
      optionsProvided = true;
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


  if (!optionsProvided) {
    throw new Error('No update options provided.');
  }

  // Let TaskManager handle TaskNotFoundError and other potential errors
  const updatedTask = await taskManager.updateTask(id, updateData);
  return updatedTask;
}

export async function registerUpdateCommand(
  program: Command,
  taskManager: TaskManager,
) {
  program
    .command('update')
    .description('Update an existing task')
    .argument('<id>', 'ID of the task to update')
    .option('-t, --title <title>', 'New title for the task')
    .option('-d, --description <description>', 'New description for the task')
    .option(
      '-p, --priority <priority>',
      `New priority (${TaskPrioritySchema.options.join(', ')})`,
    )
    .option(
      '--type <type>',
      `New type (${TaskTypeSchema.options.join(', ')})`,
    )
    .option(
      '-s, --status <status>',
      `New status (${TaskStatusSchema.options.join(', ')})`,
    )
    .option('--tags <tags...>', 'Replace all existing tags with the provided ones (space-separated)')
    .option(
      '--criteria <criteria...>',
      'Replace all existing acceptance criteria with the provided ones (space-separated)',
    )
    .option('--assignee <assignee>', 'New assignee for the task')
    .action(async (id: string, options) => {
      try {
        // Call the extracted logic function
        const updatedTask = await updateTaskLogic(taskManager, id, options);

        // Render success message (UI concern)
        render(
          React.createElement(SuccessMessage, {
            message: `Task "${updatedTask.title}" (ID: ${updatedTask.id}) updated successfully.`,
          }),
        );
      } catch (error: any) {
        // Render error message (UI concern)
        let errorMessage = 'Failed to update task.';
         if (error instanceof TaskNotFoundError) {
          errorMessage = error.message;
        } else if (error instanceof Error) { // Catch errors from updateTaskLogic
          errorMessage = error.message;
        } else {
           errorMessage = String(error); // Fallback for unexpected errors
        }
        render(React.createElement(ErrorDisplay, { error: errorMessage }));
        process.exitCode = 1;
      }
    });
}