// src/mcp/tools/listTasks.ts
import { z } from 'zod';
import { TaskManager } from '../../core/TaskManager';
import { JsonFileTaskStorage } from '../../core/storage/JsonFileTaskStorage';
import { TaskStatusSchema, TaskTypeSchema } from '../../types/task';
import { Tool, ContentResult } from 'fastmcp';

// Define input schema using Zod, matching the specification
const ListTasksParamsSchema = z.object({
  status: TaskStatusSchema.optional().describe(`Filter tasks by status (e.g. ${TaskStatusSchema.options.join(', ')})`),
  type: TaskTypeSchema.optional().describe(
    `Filter tasks by type (e.g., ${TaskTypeSchema.options.join(', ')})`
  ),
  showDependencies: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'If true, include the titles of tasks that each listed task depends on.'
    ),
  showChildren: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'If true, include the titles of direct child tasks for each listed task.'
    ),
  projectRoot: z
    .string()
    .describe('Absolute path to the project root directory on the client.'),
});

// Define the inferred type for params
type ListTasksParams = z.infer<typeof ListTasksParamsSchema>;

/**
 * Factory function that creates a listTasks tool
 * This follows the new pattern where TaskManager is instantiated dynamically
 * within the execute function using the projectRoot parameter
 */
export const listTasksTool = (): Tool<any, typeof ListTasksParamsSchema> => ({
  name: 'listTasks',
  description:
    'Lists tasks, optionally filtering by status/type and showing dependencies or children.',
  parameters: ListTasksParamsSchema,

  // Implement the execute function as per the specification
  // Use Context<any> type and specify return type as TextContent
  execute: async (params: ListTasksParams): Promise<ContentResult> => {
    // Parameters are validated by FastMCP based on the schema
    const { status, type, showDependencies, showChildren, projectRoot } = params;
    // context is unused

    try {
      // Instantiate TaskManager dynamically for this request
      const storageAdapter = new JsonFileTaskStorage(projectRoot);
      const taskManager = new TaskManager(storageAdapter);

      // 1. Fetch all tasks
      const allTasks = await taskManager.getAllTasks();

      // 2. Apply filters if provided
      let filteredTasks = allTasks;
      if (status) {
        filteredTasks = filteredTasks.filter((task) => task.status === status);
      }
      if (type) {
        filteredTasks = filteredTasks.filter((task) => task.type === type);
      }

      // 3. Handle case where no tasks match the criteria - return TextContent with stringified empty array
      if (filteredTasks.length === 0) {
        return {
          isError: false,
          content: [{ type: 'text', text: JSON.stringify([]) }],
        };
      }

      // 4. Prepare response data, potentially augmenting with dependency and/or children titles
      let responseData = filteredTasks;

      // Create a map for efficient ID-to-title lookup if needed for dependencies or children
      let taskMap: Map<string, string> | null = null;
      let parentToChildrenMap: Map<string, string[]> | null = null;

      if (showDependencies || showChildren) {
        taskMap = new Map(allTasks.map((task) => [task.id, task.title]));
      }

      // Build parent-to-children map if showing children
      if (showChildren) {
        parentToChildrenMap = new Map<string, string[]>();
        for (const task of allTasks) {
          if (task.parentTaskId) {
            if (!parentToChildrenMap.has(task.parentTaskId)) {
              parentToChildrenMap.set(task.parentTaskId, []);
            }
            parentToChildrenMap.get(task.parentTaskId)?.push(task.title);
          }
        }
      }

      // Process each task to add dependency and/or children titles
      responseData = filteredTasks.map((task) => {
        const enhancedTask: any = { ...task };

        // Add dependency titles if requested
        if (showDependencies && taskMap) {
          enhancedTask.dependsOnTitles = task.dependencies.map(
            (depId) => taskMap?.get(depId) || `Unknown Task (ID: ${depId})`
          );
        }

        // Add children titles if requested
        if (showChildren && parentToChildrenMap) {
          enhancedTask.childrenTitles = parentToChildrenMap.get(task.id) || [];
        }

        return enhancedTask;
      });

      // 5. Return success response with data as TextContent object { type: 'text', text: string }
      return {
        isError: false,
        content: [
          { type: 'text', text: JSON.stringify(responseData, null, 2) }, // Stringify the response data
        ],
      };
    } catch (error: unknown) {
      // 6. Handle unexpected errors by throwing
      console.error('Error in listTasks tool:', error);
      // Throw an error for FastMCP to handle
      throw new Error(
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while listing tasks.'
      );
    }
  },
});
