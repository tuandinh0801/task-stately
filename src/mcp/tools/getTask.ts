import { TaskManager } from '../../core/TaskManager';
import { JsonFileTaskStorage } from '../../core/storage/JsonFileTaskStorage';
import { z } from 'zod';
import { TaskNotFoundError } from '../../types/task';
import { ContentResult, Tool } from 'fastmcp';

// Define input schema using Zod
const GetTaskParamsSchema = z.object({
  id: z.string().min(1, { message: 'Task ID must be a non-empty string.' }),
  projectRoot: z
    .string()
    .describe('Absolute path to the project root directory on the client.'),
});

// Define the inferred type for params
type GetTaskParams = z.infer<typeof GetTaskParamsSchema>;

/**
 * Factory function that creates a getTask tool
 * This follows the new pattern where TaskManager is instantiated dynamically
 * within the execute function using the projectRoot parameter
 */
export const getTaskTool = (): Tool<any, typeof GetTaskParamsSchema> => ({
  name: 'getTask',
  description: 'Retrieves details for a specific task by ID.',
  parameters: GetTaskParamsSchema,
  execute: async (params: GetTaskParams): Promise<ContentResult> => {
    // Parameters are already validated by FastMCP if schema is provided
    const { id, projectRoot } = params;

    try {
      // Instantiate TaskManager dynamically for this request
      const storageAdapter = new JsonFileTaskStorage(projectRoot);
      const taskManager = new TaskManager(storageAdapter);

      // Call TaskManager to get the task
      const task = await taskManager.getTask(id);

      // Check if the task was found; if not, throw TaskNotFoundError
      if (!task) {
        throw new TaskNotFoundError(id);
      }

      // Return the TextContent object directly
      return {
        isError: false,
        content: [
          {
            type: 'text',
            text: JSON.stringify(task, null, 2), // Serialize task to JSON string
          },
        ],
      };
    } catch (error: unknown) {
      // Handle TaskNotFoundError specifically (or let it propagate)
      if (error instanceof TaskNotFoundError) {
        // Re-throw the specific error for FastMCP to handle
        throw error;
      }

      // Log and re-throw unexpected errors
      console.error(`Unexpected error in getTask tool for ID ${id}:`, error);
      // Throw a generic error for FastMCP to handle
      throw new Error(
        `An unexpected error occurred while retrieving task ${id}.`
      );
    }
  },
});
