import { TaskManager } from '../../core/TaskManager';
import { JsonFileTaskStorage } from '../../core/storage/JsonFileTaskStorage';
import { z } from 'zod';
import { Task, TaskNotFoundError } from '../../types/task';
import { ContentResult, Tool } from 'fastmcp';

// Define input schema using Zod
const GetTaskParamsSchema = z.object({
  id: z.string().min(1, { message: 'Task ID must be a non-empty string.' }).describe('Task ID to retrieve'),
  projectRoot: z
    .string()
    .describe('Absolute path to the project root directory on the client.'),
  showChildren: z
    .boolean()
    .optional()
    .default(false)
    .describe('If true, include the titles of direct child tasks.'),
  showDependencies: z
    .boolean()
    .optional()
    .default(false)
    .describe('If true, include the titles of tasks this task depends on.'),
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
    const { id, projectRoot, showChildren, showDependencies } = params;

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

      // Initialize response object with the base task data
      const responseObject: Task & { childrenTitles?: string[]; dependsOnTitles?: string[] } = { ...task };

      // Fetch all tasks ONCE if needed for children or dependencies to optimize
      let allTasks: Task[] = [];
      let taskMapById: Map<string, Task> = new Map();
      
      if (showChildren || showDependencies) {
        allTasks = await taskManager.getAllTasks();
        // Create a map for efficient lookups
        taskMapById = new Map(allTasks.map((task) => [task.id, task]));
      }

      // Include children titles if requested
      if (showChildren) {
        const childrenTitles: string[] = [];
        for (const potentialChild of allTasks) {
          if (potentialChild.parentTaskId === id) {
            childrenTitles.push(potentialChild.title);
          }
        }
        responseObject.childrenTitles = childrenTitles;
      }

      // Include dependency titles if requested
      if (showDependencies) {
        const dependsOnTitles: string[] = [];
        for (const dependencyId of task.dependencies) {
          const dependencyTask = taskMapById.get(dependencyId);
          if (dependencyTask) {
            dependsOnTitles.push(dependencyTask.title);
          } else {
            dependsOnTitles.push(`Unknown Task (ID: ${dependencyId})`);
          }
        }
        responseObject.dependsOnTitles = dependsOnTitles;
      }

      // Return the TextContent object directly
      return {
        isError: false,
        content: [
          {
            type: 'text',
            text: JSON.stringify(responseObject, null, 2), // Serialize task to JSON string
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
