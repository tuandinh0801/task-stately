import { Tool, TextContent, ContentResult } from 'fastmcp';
import { z } from 'zod';
import { TaskManager } from '../../core/TaskManager';
import { JsonFileTaskStorage } from '../../core/storage/JsonFileTaskStorage';
import { NewTaskDataSchema, Task } from '../../types/task'; // Import Task type
import type { ZodSchema } from 'zod'; // Import ZodSchema type

// Define schema for inline child creation (similar to NewTaskData but without parentId)
const InlineChildTaskDataSchema = NewTaskDataSchema.omit({
  parentTaskId: true,
});

// Extend AddTaskParamsSchema to include optional children and projectRoot
const AddTaskParamsSchema = NewTaskDataSchema.extend({
  children: z
    .array(InlineChildTaskDataSchema)
    .optional()
    .describe('Optional array of child tasks to create simultaneously.'),
  projectRoot: z
    .string()
    .describe('Absolute path to the project root directory on the client.'),
});

// Define the inferred type for params
type AddTaskParams = z.infer<typeof AddTaskParamsSchema>;

/**
 * Factory function that creates an addTask tool
 * This follows the new pattern where TaskManager is instantiated dynamically
 * within the execute function using the projectRoot parameter
 */
export const addTaskTool = (): Tool<any, typeof AddTaskParamsSchema> => ({
  name: 'addTask',
  description:
    'Adds a single new task, optionally linking to a parent and creating child tasks simultaneously.',
  parameters: AddTaskParamsSchema,

  execute: async (params: AddTaskParams) => {
    // Params validated by FastMCP
    // Extract projectRoot and separate it from the task data
    const { children, projectRoot, ...parentTaskData } = params;

    try {
      // Instantiate TaskManager dynamically for this request
      const storageAdapter = new JsonFileTaskStorage(projectRoot);
      const taskManager = new TaskManager(storageAdapter);

      // Create the parent task
      const parentTask = await taskManager.createTask(parentTaskData);

      // Return the created task as a TextContent object.
      const result: ContentResult = {
        isError: false,
        content: [
          {
            type: 'text',
            text: JSON.stringify(parentTask, null, 2),
          },
        ],
      };
      return result;
    } catch (error: unknown) {
      console.error('Error in addTask tool:', error);
      // Re-throw the error so the MCP server wrapper can format it correctly
      if (error instanceof Error) {
        throw error; // Throw known errors
      }
      throw new Error('An unexpected error occurred while adding the task.'); // Throw generic for unknown
    }
  },
});
