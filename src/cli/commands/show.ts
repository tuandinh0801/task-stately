import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { TaskManager } from '../../core/TaskManager';
import TaskDetail from '../components/TaskDetail';
import ErrorDisplay from '../components/ErrorDisplay';
import { Task, TaskNotFoundError } from '@/types/task'; // Import TaskNotFoundError

/**
 * Pure logic for fetching a single task by ID.
 * @param taskManager The TaskManager instance.
 * @param id The ID of the task to fetch.
 * @returns Promise resolving to the Task or undefined if not found.
 * @throws Rethrows any error from taskManager.getTask.
 */
export async function getShowTaskLogic(
  taskManager: TaskManager,
  id: string
): Promise<Task> {
  // This function ONLY interacts with TaskManager and returns data or throws.
  // No React/Ink imports or usage here.
  if (!id || id.trim() === '') {
    throw new Error('Task ID cannot be empty.');
  }
  const task = await taskManager.getTask(id);
  if (!task) {
    throw new TaskNotFoundError(id);
  }
  return task;
}

/**
 * Fetches child tasks for a given parent task ID.
 * @param taskManager The TaskManager instance.
 * @param parentTaskId The ID of the parent task.
 * @returns Promise resolving to an array of child Tasks.
 */
export async function getChildTasksLogic(
  taskManager: TaskManager,
  parentTaskId: string
): Promise<Task[]> {
  const allTasks = await taskManager.getAllTasks();
  return allTasks.filter(task => task.parentTaskId === parentTaskId);
}

/**
 * Action handler for the 'show' command. Responsible for calling logic,
 * handling results/errors, and preparing the React element for rendering.
 * @param taskManager - The TaskManager instance.
 * @param id - The ID of the task to show.
 * @returns A React element (TaskDetail or ErrorDisplay).
 */
export async function showAction(
  taskManager: TaskManager,
  id: string
): Promise<React.ReactElement> {
  try {
    const task = await getShowTaskLogic(taskManager, id);
    
    // If the task has child tasks, fetch them
    let childTasks: Task[] = [];
    if (task.childTaskIds.length > 0) {
      childTasks = await getChildTasksLogic(taskManager, task.id);
    }
    
    // On success (task is defined), create the TaskDetail element with child tasks
    return React.createElement(TaskDetail, { task, childTasks });
  } catch (error) {
    // Handle unexpected errors from the logic function
    const errorToDisplay =
      error instanceof Error ? error : new Error(String(error));
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
  taskManager: TaskManager
): void {
  // Return void
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
