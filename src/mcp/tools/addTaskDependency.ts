import { z } from 'zod';
import { TaskManager } from '../../core/TaskManager';
import { JsonFileTaskStorage } from '../../core/storage/JsonFileTaskStorage';
import { TaskNotFoundError } from '../../types/task'; // Correct import path
import { ContentResult, TextContent, Tool } from 'fastmcp'; // Keep TextContent TYPE import

/**
 * Zod schema for the parameters of the addTaskDependency tool.
 * Requires taskId (the task to add the dependency to) and dependencyId (the task that must be completed first).
 */
const AddDependencyParamsSchema = z.object({
  taskId: z.string().describe('The ID of the task to add the dependency to.'),
  dependencyId: z
    .string()
    .describe('The ID of the task that must be completed first.'),
  projectRoot: z
    .string()
    .describe('Absolute path to the project root directory on the client.'),
});

// Define the inferred type for params
type AddDependencyParams = z.infer<typeof AddDependencyParamsSchema>;

/**
 * Factory function to create the addTaskDependency tool.
 * This follows the new pattern where TaskManager is instantiated dynamically
 * within the execute function using the projectRoot parameter
 * @returns The MCP tool definition.
 */
export const addTaskDependencyTool = (): Tool<
  any,
  typeof AddDependencyParamsSchema
> => ({
  name: 'addTaskDependency',
  description: 'Adds a dependency relationship between two tasks.',
  parameters: AddDependencyParamsSchema, // Use 'parameters' key for Zod schema
  execute: async (params: AddDependencyParams): Promise<ContentResult> => {
    const { taskId, dependencyId, projectRoot } = params;

    try {
      // Instantiate TaskManager dynamically for this request
      const storageAdapter = new JsonFileTaskStorage(projectRoot);
      const taskManager = new TaskManager(storageAdapter);

      await taskManager.addTaskDependency(taskId, dependencyId);
      // Return a plain object matching the TextContent structure
      const successResult: TextContent = {
        type: 'text',
        text: `Dependency added successfully: Task '${taskId}' now depends on Task '${dependencyId}'.`,
      };
      return {
        isError: false,
        content: [successResult],
      };
    } catch (error: unknown) {
      if (error instanceof TaskNotFoundError) {
        // Re-throw specific error for FastMCP to potentially handle differently
        console.error(`Error adding dependency: ${error.message}`);
        throw error; // Re-throw the original TaskNotFoundError
      } else if (error instanceof Error) {
        // Check specifically for circular dependency error message from TaskManager
        if (error.message.toLowerCase().includes('circular dependency')) {
          console.error(
            `Circular dependency detected between ${taskId} and ${dependencyId}:`,
            error.message
          );
          // Throw specific error message expected by the test
          throw new Error(
            `Circular dependency detected: Adding this dependency would create a cycle.`
          );
        }
        // Handle other known errors
        console.error(
          `Error adding dependency between ${taskId} and ${dependencyId}:`,
          error.message
        );
        // Throw a generic error for FastMCP for other errors
        throw new Error(`Failed to add dependency: ${error.message}`);
      } else {
        // Handle unexpected errors
        console.error(
          `An unexpected error occurred while adding dependency between ${taskId} and ${dependencyId}:`,
          error
        );
        throw new Error(
          'An unexpected error occurred while adding the task dependency.'
        );
      }
    }
  },
});
