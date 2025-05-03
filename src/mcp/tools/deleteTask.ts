import { TaskManager } from '../../core/TaskManager';
import { JsonFileTaskStorage } from '../../core/storage/JsonFileTaskStorage';
import { z } from 'zod';
import { Tool, ContentResult } from 'fastmcp'; // Import Tool and TextContent

// Define input schema
const DeleteTaskParamsSchema = z.object({
  id: z.string().min(1, { message: 'Task ID must be a non-empty string.' }),
  cascade: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'If true, recursively delete child tasks. Defaults to false (orphaning children).'
    ),
  projectRoot: z
    .string()
    .describe('Absolute path to the project root directory on the client.'),
});

// Define the inferred type for params
type DeleteTaskParams = z.infer<typeof DeleteTaskParamsSchema>;

/**
 * Factory function to create the deleteTask tool.
 * This follows the new pattern where TaskManager is instantiated dynamically
 * within the execute function using the projectRoot parameter
 * @returns The MCP tool definition.
 */
export const deleteTaskTool = (): Tool<any, typeof DeleteTaskParamsSchema> => ({
  name: 'deleteTask',
  description: 'Deletes a task by ID, optionally cascading to children.',
  parameters: DeleteTaskParamsSchema,
  // Add context parameter to match expected signature, use args
  execute: async (args: DeleteTaskParams): Promise<ContentResult> => {
    const { id, cascade, projectRoot } = args;

    try {
      // Instantiate TaskManager dynamically for this request
      const storageAdapter = new JsonFileTaskStorage(projectRoot);
      const taskManager = new TaskManager(storageAdapter);

      // Call taskManager.deleteTask and check its return value
      const deleted = await taskManager.deleteTask(id, cascade);

      if (!deleted) {
        // TaskManager returned false, meaning the task was not found
        return {
          isError: true,
          content: [{ type: 'text', text: `Task with ID "${id}" not found.` }],
        };
      }

      // On success (deleted === true), return the success message
      return {
        isError: false,
        content: [
          {
            type: 'text',
            text: `Task ${id} ${cascade ? 'and its children ' : ''}deleted successfully.`,
          },
        ],
      };
    } catch (error: unknown) {
      // Handle unexpected errors during task deletion (e.g., storage issues)
      console.error(`Unexpected error in deleteTask tool for ID ${id}:`, error);
      // Throw a generic error message
      throw new Error(
        `An unexpected error occurred while deleting task ${id}.`
      );
    }
  },
});
