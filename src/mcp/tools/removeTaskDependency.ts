import { z } from 'zod';
import { ContentResult, TextContent, Tool } from 'fastmcp'; // Correct import
import { TaskManager } from '../../core/TaskManager';
import { JsonFileTaskStorage } from '../../core/storage/JsonFileTaskStorage';
import { TaskNotFoundError } from '../../types/task'; // Correct import path

// Define the schema for the input parameters
const RemoveDependencyParamsSchema = z.object({
  taskId: z
    .string()
    .describe('The ID of the task to remove the dependency from'),
  dependencyId: z.string().describe('The ID of the dependency task to remove'),
  projectRoot: z
    .string()
    .describe('Absolute path to the project root directory on the client.'),
});

// Define the inferred type for params
type RemoveDependencyParams = z.infer<typeof RemoveDependencyParamsSchema>;

/**
 * Factory function to create the removeTaskDependency tool.
 * This follows the new pattern where TaskManager is instantiated dynamically
 * within the execute function using the projectRoot parameter
 * @returns The MCP tool definition.
 */
export const removeTaskDependencyTool = (): Tool<
  any,
  typeof RemoveDependencyParamsSchema
> => ({
  name: 'removeTaskDependency',
  description: 'Removes a dependency between two tasks',
  parameters: RemoveDependencyParamsSchema, // Use 'parameters' key
  execute: async (params: RemoveDependencyParams): Promise<ContentResult> => {
    // Explicit types
    const { taskId, dependencyId, projectRoot } = params;

    // Instantiate TaskManager dynamically for this request
    const storageAdapter = new JsonFileTaskStorage(projectRoot);
    const taskManager = new TaskManager(storageAdapter);

    try {
      await taskManager.removeTaskDependency(taskId, dependencyId);
      // Return a plain object matching the TextContent structure
      const successResult: TextContent = {
        type: 'text',
        text: `Dependency removed successfully: Task '${taskId}' no longer depends on Task '${dependencyId}'.`, // Use 'text' key
      };
      return { isError: false, content: [successResult] };
    } catch (error: unknown) {
      // Catch unknown
      if (error instanceof TaskNotFoundError) {
        // Re-throw specific error for FastMCP to potentially handle differently
        console.error(`Error removing dependency: ${error.message}`);
        throw error; // Re-throw the original TaskNotFoundError
      } else if (error instanceof Error) {
        // Handle other known errors
        console.error(
          `Error removing dependency between ${taskId} and ${dependencyId}:`,
          error.message
        );
        // Throw a generic error for FastMCP
        throw new Error(`Failed to remove dependency: ${error.message}`);
      } else {
        // Handle unexpected errors
        console.error(
          `An unexpected error occurred while removing dependency between ${taskId} and ${dependencyId}:`,
          error
        );
        throw new Error(
          'An unexpected error occurred while removing the task dependency.'
        );
      }
    }
  },
}); // Add missing closing parenthesis for the returned object
