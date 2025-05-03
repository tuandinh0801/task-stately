import { ContentResult, Tool } from 'fastmcp';
import { TaskManager } from '../../core/TaskManager';
import { JsonFileTaskStorage } from '../../core/storage/JsonFileTaskStorage';
import { z } from 'zod';
import { UpdateTaskDataSchema, TaskNotFoundError } from '../../types/task';

// Define input schema - requires the ID and the update data
const UpdateTaskParamsSchema = z.object({
  id: z.string().min(1, { message: 'Task ID must be a non-empty string.' }),
  updates: UpdateTaskDataSchema.describe('The data to update the task with.'),
  projectRoot: z
    .string()
    .describe('Absolute path to the project root directory on the client.'),
});

// Define the inferred type for params
type UpdateTaskParams = z.infer<typeof UpdateTaskParamsSchema>;

/**
 * Factory function to create the updateTask tool.
 * This follows the new pattern where TaskManager is instantiated dynamically
 * within the execute function using the projectRoot parameter
 * @returns The MCP tool definition.
 */
export const updateTaskTool = (): Tool<any, typeof UpdateTaskParamsSchema> => ({
  name: 'updateTask',
  description: 'Updates an existing task by ID with the provided data.',
  parameters: UpdateTaskParamsSchema,
  execute: async (params: UpdateTaskParams): Promise<ContentResult> => {
    // Return TextContent directly on success
    const { id, updates, projectRoot } = params;

    // Check if updates object is empty
    if (Object.keys(updates).length === 0) {
      // Throw a standard Error for invalid input
      throw new Error('No update data provided.');
    }

    try {
      // Instantiate TaskManager dynamically for this request
      const storageAdapter = new JsonFileTaskStorage(projectRoot);
      const taskManager = new TaskManager(storageAdapter);

      // Call TaskManager.updateTask
      const updatedTask = await taskManager.updateTask(id, updates);

      // Return successful response with updated task data as JSON in TextContent
      return {
        isError: false,
        content: [
          {
            type: 'text',
            text: JSON.stringify(updatedTask, null, 2), // Serialize updated task to JSON
          },
        ],
      };
    } catch (error: unknown) {
      // Handle TaskNotFoundError specifically
      if (error instanceof TaskNotFoundError) {
        // Throw standard Error for known error conditions
        throw new Error(error.message);
      }
      // Handle other unexpected errors
      console.error(`Error in updateTask tool for ID ${id}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // Throw a generic standard Error for unexpected issues
      throw new Error(
        `An unexpected error occurred while updating task ${id}: ${errorMessage}`
      );
    }
  },
});
