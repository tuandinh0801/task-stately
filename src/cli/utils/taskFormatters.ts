import { Task } from '@/types/task';
import { DisplayTask } from '../commands/list';

// Constants for status and priority emojis
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

/**
 * Formats child tasks for display in a hierarchical table
 * This function is specifically designed for the child tasks display in TaskDetail
 * and is separate from the list command's implementation for better maintainability.
 *
 * @param tasks Array of child tasks to format
 * @returns Array of DisplayTask objects ready for rendering
 */
export function formatChildTasksForDisplay(tasks: Task[]): DisplayTask[] {
  if (!tasks.length) return [];

  // Create a map for quick task lookup
  const taskMap: Record<string, Task> = {};
  tasks.forEach((t) => {
    taskMap[t.id] = t;
  });

  // Build children map for hierarchy
  const childrenMap: Record<string, Task[]> = {};
  tasks.forEach((task) => {
    if (task.parentTaskId) {
      if (!childrenMap[task.parentTaskId]) childrenMap[task.parentTaskId] = [];
      childrenMap[task.parentTaskId].push(task);
    }
  });

  // Result array to hold formatted tasks
  const result: DisplayTask[] = [];

  // Recursive function to walk the task tree
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
      indentPrefix + (depth > 0 ? (isLast ? '   ' : '│  ') : '');
      
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
      parentTaskId: task.parentTaskId,
      depth: depth,
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

  // Find the parent task(s) in the array
  const parentIds = new Set(tasks.map(t => t.parentTaskId));
  const rootTasks = tasks.filter(t => !parentIds.has(t.id));
  
  // Start walking from each root task
  rootTasks
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((root, index, arr) => {
      walk(root, 0, index === arr.length - 1, '');
    });

  return result;
}