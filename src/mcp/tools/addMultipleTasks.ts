import { z } from 'zod';
import { ContentResult, Tool } from 'fastmcp';
// Import NewTaskDataSchema which now includes the optional 'children' array
import { NewTaskDataSchema, Task, NewTaskData } from '../../types/task';
import { TaskNotFoundError, TaskManager } from '../../core/TaskManager'; // Import TaskNotFoundError and TaskManager here
import { JsonFileTaskStorage } from '../../core/storage/JsonFileTaskStorage';

// Note: InlineChildTaskDataSchema is no longer needed here as NewTaskDataSchema handles it.

// Schema for a single task definition within the batch
const BatchTaskDefinitionSchema = z.object({
  tempId: z
    .string()
    .min(1)
    .describe(
      'Unique temporary ID for this task within the batch request (e.g., "task-A").'
    ),
  // taskData now implicitly includes the optional 'children' array based on the updated NewTaskDataSchema
  taskData: NewTaskDataSchema.describe(
    'Data for the main task to be created, potentially including inline children.'
  ),
  // REMOVED: children: z.array(InlineChildTaskDataSchema).optional().describe('Optional array of child tasks to create under this main task.'),
  tempDependencies: z
    .array(z.string())
    .optional()
    .describe(
      'Array of tempIds (of other main tasks in this batch) that this task depends on.'
    ),
  existingDependencies: z
    .array(z.string())
    .optional()
    .describe('Array of real IDs of existing tasks that this task depends on.'),
});

// Define input schema for the main tool: an array of batch task definitions
const AddMultipleTasksParamsSchema = z.object({
  tasks: z
    .array(BatchTaskDefinitionSchema)
    .min(1, 'At least one task definition is required.'),
  projectRoot: z
    .string()
    .describe('Absolute path to the project root directory on the client.'),
});

// Define the inferred type for params
type AddMultipleTasksParams = z.infer<typeof AddMultipleTasksParamsSchema>;

/**
 * Factory function that creates an addMultipleTasks tool
 * This follows the new pattern where TaskManager is instantiated dynamically
 * within the execute function using the projectRoot parameter
 */
export const addMultipleTasksTool = (): Tool<
  any,
  typeof AddMultipleTasksParamsSchema
> => ({
  name: 'addMultipleTasks',
  description:
    'Adds multiple tasks (each potentially with children) in a batch, resolving dependencies between the main tasks.',
  parameters: AddMultipleTasksParamsSchema,

  // Add explicit type for params using z.infer
  execute: async (params: AddMultipleTasksParams): Promise<ContentResult> => {
    const { tasks: taskDefinitions, projectRoot } = params;

    // Instantiate TaskManager dynamically for this request
    const storageAdapter = new JsonFileTaskStorage(projectRoot);
    const taskManager = new TaskManager(storageAdapter);
    const tempIdToRealIdMap = new Map<string, string>();
    const createdMainTaskIds: string[] = []; // Store IDs for refetching
    const tasksToUpdateDeps: {
      realId: string;
      tempDeps: string[];
      existingDeps: string[];
    }[] = [];
    // Store children definitions with their intended parent's real ID once known
    const childrenToCreateLater: {
      parentRealId: string;
      childInput: { tempId: string; taskData: NewTaskData };
    }[] = [];
    const createdChildTasks: Task[] = []; // Initialize array to store created children

    // Keep track of all created IDs for potential rollback
    const createdTaskIdsThisRun = new Set<string>();

    try {
      // --- Phase 1: Create all Main tasks ---
      for (const definition of taskDefinitions) {
        // Separate children from the rest of the task data for main task creation
        const { children: inlineChildren, ...mainTaskDataToCreate } =
          definition.taskData;

        // Ensure parentTaskId is not accidentally provided in the main task data
        if (mainTaskDataToCreate.parentTaskId) {
          console.warn(
            `Ignoring parentTaskId provided for main task with tempId "${definition.tempId}" in addMultipleTasks.`
          );
          delete mainTaskDataToCreate.parentTaskId; // Remove it explicitly
        }

        // Create the main task without the children property
        const newMainTask = await taskManager.createTask(mainTaskDataToCreate);
        tempIdToRealIdMap.set(definition.tempId, newMainTask.id);
        createdMainTaskIds.push(newMainTask.id); // Store ID for response
        createdTaskIdsThisRun.add(newMainTask.id); // Add to rollback set

        // Store info needed for dependency update phase
        tasksToUpdateDeps.push({
          realId: newMainTask.id,
          tempDeps: definition.tempDependencies || [],
          existingDeps: definition.existingDependencies || [],
        });

        // Store inline children definitions to be created later, linking to the parent's *real* ID
        if (inlineChildren && inlineChildren.length > 0) {
          inlineChildren.forEach((childInput) => {
            // We need the child's tempId later if it's a dependency target,
            // but TaskManager only needs the taskData and parentRealId for creation.
            childrenToCreateLater.push({
              parentRealId: newMainTask.id,
              childInput,
            });
          });
        }
      }

      // --- Phase 2: Create Inline Children ---
      // Now create the children, linking them to their parent's real ID
      for (const { parentRealId, childInput } of childrenToCreateLater) {
        // Ensure parentTaskId is not accidentally provided in the child task data itself
        const { parentTaskId: childParentId, ...childDataToCreate } =
          childInput.taskData;
        if (childParentId) {
          console.warn(
            `Ignoring parentTaskId provided within child taskData (tempId: "${childInput.tempId}") in addMultipleTasks. Using parent task's ID.`
          );
        }

        const newChildTask = await taskManager.createTask({
          ...childDataToCreate, // Spread the actual child task data
          parentTaskId: parentRealId, // Set the correct parent ID
        });
        createdChildTasks.push(newChildTask); // Add created child to the response array
        createdTaskIdsThisRun.add(newChildTask.id); // Add child to rollback set
        // TaskManager's createTask should handle updating the parent's childTaskIds array internally

        // Map the child's tempId to its realId if it might be a dependency target
        // (Although the current schema doesn't support children as direct dependency targets via tempId)
        // tempIdToRealIdMap.set(childInput.tempId, newChildTask.id);
      }

      // --- Phase 3: Update Dependencies (for main tasks) ---
      for (const taskToUpdate of tasksToUpdateDeps) {
        const finalDependenciesSet = new Set<string>(taskToUpdate.existingDeps);
        let depsChanged = false;

        // Resolve temporary dependencies
        for (const tempDepId of taskToUpdate.tempDeps) {
          const realDepId = tempIdToRealIdMap.get(tempDepId);
          if (!realDepId) {
            // Throw an error if a temporary dependency cannot be resolved
            throw new Error(
              `Invalid temporary dependency ID "${tempDepId}" referenced by task associated with real ID "${taskToUpdate.realId}".`
            );
          }
          if (!finalDependenciesSet.has(realDepId)) {
            finalDependenciesSet.add(realDepId);
            depsChanged = true;
          }
        }

        // Fetch the original task to compare dependencies if needed (optional optimization)
        // const originalTask = await taskManager.findTask(taskToUpdate.realId);
        // const originalDepsSet = new Set(originalTask?.dependencies || []);
        // if (depsChanged || finalDependenciesSet.size !== originalDepsSet.size) { ... }

        // Only call update if dependencies actually need setting or changing
        // Check if existingDeps were provided or tempDeps resolved to something
        if (
          depsChanged ||
          taskToUpdate.existingDeps.length > 0 ||
          taskToUpdate.tempDeps.length > 0
        ) {
          const finalDependencies = Array.from(finalDependenciesSet);
          // Check if the final list is different from the (potentially empty) initial list
          const originalTask = await taskManager.getTask(taskToUpdate.realId); // Need to fetch to compare - Use getTask
          if (!originalTask) throw new TaskNotFoundError(taskToUpdate.realId); // Should not happen
          const originalDeps = originalTask.dependencies || [];
          if (
            finalDependencies.length !== originalDeps.length ||
            !finalDependencies.every((dep) => originalDeps.includes(dep))
          ) {
            await taskManager.updateTask(taskToUpdate.realId, {
              dependencies: finalDependencies,
            });
          }
        }
      }

      // Refetch main tasks to ensure dependencies are reflected in the response
      const finalMainTasks = await Promise.all(
        // Use getTask and add explicit type for 't'
        createdMainTaskIds.map((id) =>
          taskManager.getTask(id).then((t: Task | undefined) => {
            if (!t) throw new TaskNotFoundError(id); // Should exist
            return t;
          })
        )
      );

      // Return structured data using TextContent
      const resultData = {
        mainTasks: finalMainTasks,
        childTasks: createdChildTasks,
      };

      // Return data directly, assuming FastMCP handles content wrapping
      return {
        isError: false,
        content: [
          {
            type: 'text',
            text: JSON.stringify(resultData, null, 2), // Stringify the result data
          },
        ],
      };
    } catch (error: unknown) {
      console.error('Error during addMultipleTasks execution:', error);

      // --- Rollback Logic ---
      if (createdTaskIdsThisRun.size > 0) {
        console.warn(
          `Rolling back ${createdTaskIdsThisRun.size} tasks due to error during batch add.`
        );
        // Delete tasks in reverse order of creation? Not strictly necessary but might be cleaner
        const idsToDelete = Array.from(createdTaskIdsThisRun); //.reverse();
        for (const taskIdToDelete of idsToDelete) {
          try {
            // Use deleteTask which should handle removing children/dependency links if necessary
            // We assume deleteTask is robust enough not to fail if the task was already partially deleted or doesn't exist.
            await taskManager.deleteTask(taskIdToDelete);
            console.log(`Rolled back task ${taskIdToDelete}`);
          } catch (rollbackError: any) {
            // Log rollback error but continue trying to delete others
            console.error(
              `Failed to rollback task ${taskIdToDelete}:`,
              rollbackError.message
            );
            // Depending on requirements, we might want to re-throw a more specific rollback failure error here.
          }
        }
      }
      // --- End Rollback Logic ---

      // Re-throw the original error after attempting rollback
      throw new Error(
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while adding multiple tasks.'
      );
    }
  },
});
