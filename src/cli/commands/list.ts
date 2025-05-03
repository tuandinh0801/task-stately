import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { TaskManager } from '../../core/TaskManager';
import TaskList from '../components/TaskList';
import ErrorDisplay from '../components/ErrorDisplay';
import {
  Task,
  TaskStatus,
  TaskStatusSchema, // Import the type
  // TaskSchema is not directly needed here anymore
} from '@/types/task';
// Removed InteractiveTaskList import as TaskList will handle both views
// Removed z import as TaskTreeNodeSchema is removed

// Define valid sort fields
const validSortFields = [
  'id',
  'title',
  'status',
  'priority',
  'type',
  'createdAt',
  'updatedAt',
] as const;
type SortField = (typeof validSortFields)[number];

interface ListOptions {
  status?: TaskStatus;
  sortBy?: SortField;
  withSubtasks?: boolean; // Show tasks grouped by parent/subtasks in table view, in hierarchy order
}

// Removed local TaskTreeNode type and TaskTreeNodeSchema definitions

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
    tasks = tasks.filter((task) => task.status === options.status);
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

      // Use localeCompare for potentially more natural string sorting (handles numbers within strings better)
      if (typeof valA === 'string' && typeof valB === 'string') {
        // Use default localeCompare without specific options first
        return valA.localeCompare(valB);
      }
      // Fallback for non-string types or mixed types
      if (valA < valB) return -1;
      if (valA > valB) return 1;
      return 0;
    });
  }

  return tasks;
}

// --- Task List Table Refactor Constants and Types ---

// Emoji mapping for status and priority
const STATUS_EMOJI: Record<string, string> = {
  pending: '🟡',
  'in-progress': '🟠',
  done: '✅',
  review: '🔵',
  deferred: '⏸',
  cancelled: '❌',
};
const PRIORITY_EMOJI: Record<string, string> = {
  high: '🔴',
  medium: '🟡',
  low: '🟢',
};
//
// DisplayTask structure for table
export interface DisplayTask {
  id: string;
  displayId: string;
  title: string;
  status: TaskStatus;
  statusEmoji: string;
  priority?: string;
  priorityEmoji?: string;
  depth: number;
  parentTaskId: string | null | undefined; // Allow null or undefined
  description?: string;
  type: string;
  complexity?: number;
  tags: string[];
  dependencies: string[];
  childTaskIds: string[];
  acceptanceCriteria: string[];
  artifacts: string[];
  assignee?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Recursively orders tasks to flatten by parent-child (e.g. like a tree expand), and sets depth/indented displayId.
 */
export function prepareDisplayTasks(
  tasks: Task[],
  withSubtasks: boolean,
  sortBy?: SortField
): DisplayTask[] {
  // index by id for fast parent lookup
  const taskMap: Record<string, Task> = {};
  tasks.forEach((t) => {
    taskMap[t.id] = t;
  });

  // Build children map
  const childrenMap: Record<string, Task[]> = {};
  tasks.forEach((task) => {
    if (task.parentTaskId) {
      if (!childrenMap[task.parentTaskId]) childrenMap[task.parentTaskId] = [];
      childrenMap[task.parentTaskId].push(task);
    }
  });

  // Find all root tasks
  const roots = tasks.filter(
    (t) => !t.parentTaskId || !taskMap[t.parentTaskId]
  );

  // Recursively flatten tree into DisplayTask[], capturing depth
  const result: DisplayTask[] = [];
  function walk(
    task: Task,
    depth: number,
    isLast: boolean,
    indentPrefix: string
  ) {
    // Calculate branch only if depth > 0, otherwise it's empty
    const branch = depth > 0 ? (isLast ? '└─ ' : '├─ ') : '';
    // Calculate the indent string for children of this task
    const childIndentPrefix =
      indentPrefix + (depth > 0 ? (isLast ? '   ' : '│  ') : ''); // Only add indent guides if nested
    // Construct the display ID using the parent's indent and the conditional branch
    const formattedId = `${indentPrefix}${branch}${task.id}`;

    // Get emojis
    const statusEmoji = STATUS_EMOJI[task.status] ?? '';
    const priorityEmoji = task.priority
      ? (PRIORITY_EMOJI[task.priority] ?? '')
      : '';

    // Add to display list
    result.push({
      ...task,
      parentTaskId: task.parentTaskId, // Explicitly add required property
      depth: depth,
      // isLastChild: isLast, // Removed - Property 'isLastChild' does not exist in type 'DisplayTask'.
      displayId: formattedId,
      statusEmoji: statusEmoji,
      priorityEmoji: priorityEmoji,
    });

    // Recursively traverse children
    const children = childrenMap[task.id] || [];
    children
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .forEach((child, index) => {
        // Pass the calculated childIndentPrefix to the recursive call
        walk(
          child,
          depth + 1,
          index === children.length - 1,
          childIndentPrefix
        );
      });
  }

  if (withSubtasks) {
    // Traverse the tree starting from roots
    roots
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .forEach((root, index, arr) => {
        walk(root, 0, index === arr.length - 1, ''); // Start with empty indent prefix for roots
      });
    return result;
  } else {
    // Only process root tasks for display (no hierarchy needed)
    return roots.map((task) => ({
      ...task,
      depth: 0,
      // isLastChild: true, // Removed - Property 'isLastChild' does not exist in type 'DisplayTask'.
      displayId: task.id, // No indentation/branch
      parentTaskId: task.parentTaskId, // Added missing required property
      statusEmoji: STATUS_EMOJI[task.status] ?? '',
      priorityEmoji: task.priority ? (PRIORITY_EMOJI[task.priority] ?? '') : '',
    }));
  }
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
  options: ListOptions = {} // Default options
): Promise<React.ReactElement> {
  try {
    // Pass filtering/sorting options to the logic function
    const flatTasks = await getListTasksLogic(taskManager, {
      status: options.status,
      sortBy: options.sortBy,
    });

    let tableTasks: DisplayTask[];
    if (options.withSubtasks) {
      tableTasks = prepareDisplayTasks(
        flatTasks,
        options.withSubtasks,
        options.sortBy
      );
    } else {
      // Flat, filter for root tasks and show as depth 0, no indent/emoji
      tableTasks = flatTasks
        .filter((task) => !task.parentTaskId)
        .map((t) => ({
          id: t.id,
          displayId: t.id,
          title: t.title,
          status: t.status,
          statusEmoji: STATUS_EMOJI[t.status] || '',
          priority: t.priority,
          priorityEmoji: t.priority ? (PRIORITY_EMOJI[t.priority] ?? '') : '',
          depth: 0,
          parentTaskId: t.parentTaskId,
          description: t.description,
          type: t.type,
          complexity: t.complexity,
          tags: t.tags,
          dependencies: t.dependencies,
          childTaskIds: t.childTaskIds,
          acceptanceCriteria: t.acceptanceCriteria,
          artifacts: t.artifacts,
          assignee: t.assignee,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        }));
    }

    // Use TaskList (table) - always table in this design
    return React.createElement(TaskList, { tasks: tableTasks });
  } catch (error) {
    // Ensure error is an Error instance before passing to component
    const errorToDisplay =
      error instanceof Error ? error : new Error(String(error));
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
  taskManager: TaskManager
): void {
  program
    .command('list')
    .alias('ls')
    .description(
      'List all tasks, optionally filtering by status or sorting (use --with-subtasks for hierarchy in table)'
    )
    .option(
      '-s, --status <status>',
      `Filter by status (${TaskStatusSchema.options.join(', ')})`
    )
    .option(
      '--sort-by <field>',
      `Sort tasks by field (${validSortFields.join(', ')})`
    )
    // Removed --tree option
    .option(
      '-w, --with-subtasks',
      'Display all tasks including subtasks hierarchically',
      false
    )
    .action(async (options: ListOptions) => {
      // Receive options from Commander
      // Validate status option
      if (
        options.status &&
        !TaskStatusSchema.safeParse(options.status).success
      ) {
        render(
          React.createElement(ErrorDisplay, {
            error: new Error(
              `Invalid status value: ${options.status}. Valid statuses are: ${TaskStatusSchema.options.join(', ')}`
            ),
          })
        );
        process.exitCode = 1;
        return;
      }
      // Validate sort option
      if (options.sortBy && !validSortFields.includes(options.sortBy)) {
        render(
          React.createElement(ErrorDisplay, {
            error: new Error(
              `Invalid sort field: ${options.sortBy}. Valid fields are: ${validSortFields.join(', ')}`
            ),
          })
        );
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
