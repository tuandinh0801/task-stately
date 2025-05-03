import {
  ITaskStorage,
  NewTaskData,
  UpdateTaskData,
  // Removed: NewSubtaskData,
  // Removed: UpdateSubtaskData,
} from '@/core/storage/ITaskStorage';
import {
  Task,
  TaskStatusSchema /* Removed: Subtask, SubtaskSchema */,
} from '@/types/task';

// Basic Error for missing tasks
export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`Task with ID "${taskId}" not found.`);
    this.name = 'TaskNotFoundError';
  }
}

export class TaskManager {
  private readonly storage: ITaskStorage;

  constructor(storage: ITaskStorage) {
    this.storage = storage;
    // Consider calling storage.initialize() here or require it externally
    // For now, assume storage is initialized before TaskManager methods are called
    // or rely on the storage's internal ensureInitialized checks.
  }

  // --- Task CRUD Methods ---

  async createTask(taskData: NewTaskData): Promise<Task> {
    // PRECONDITIONS: taskData is valid NewTaskData
    // POSTCONDITIONS: Task is created, parent's child list updated (if applicable), created task returned

    let parentTask: Task | undefined;

    // 1. Validate Parent Existence (if parentTaskId provided)
    if (taskData.parentTaskId != null) {
      // Check for null or undefined
      parentTask = await this.storage.getTaskById(taskData.parentTaskId);
      if (!parentTask) {
        // TEST: createTask throws error if parentTaskId is provided but parent doesn't exist
        throw new TaskNotFoundError(taskData.parentTaskId);
      }
    }

    // 2. Create the Task via Storage
    //    - Storage layer (`addTask`) is responsible for:
    //        - Reading `meta.lastTaskId`.
    //        - Incrementing `meta.lastTaskId`.
    //        - Assigning the new ID (as a string) to the task.
    //        - Setting `createdAt`, `updatedAt`.
    //        - Initializing `childTaskIds` to [].
    //        - Saving the new task and updated `meta`.
    // TEST: createTask successfully creates a task with valid data
    // TEST: createTask delegates ID generation (global sequential string) to the storage layer
    // TEST: createTask correctly sets default values (status, priority, type) if not provided
    // TEST: createTask initializes childTaskIds as an empty array via storage layer
    const newTask = await this.storage.addTask(taskData);

    // 3. Update Parent's Child List (if parentTaskId provided and parent exists)
    if (parentTask) {
      // parentTask is only defined if parentTaskId was valid
      // Ensure newTask.id is available after storage.addTask completes
      const updatedChildIds = [...parentTask.childTaskIds, newTask.id];
      // TEST: createTask adds the new task's ID to the parent's childTaskIds list
      await this.storage.updateTask(parentTask.id, {
        childTaskIds: updatedChildIds,
      });
    }

    return newTask;
  }

  async getTask(id: string): Promise<Task | undefined> {
    // Future: Add caching or authorization checks if needed
    return this.storage.getTaskById(id);
  }

  async getAllTasks(): Promise<Task[]> {
    // Future: Add filtering, sorting, or pagination logic here
    return this.storage.loadTasks();
  }

  async updateTask(id: string, updates: UpdateTaskData): Promise<Task> {
    // PRECONDITIONS: id exists, updates is valid UpdateTaskData
    // POSTCONDITIONS: Task is updated, hierarchy integrity maintained, updated task returned

    // 1. Get Original Task
    const originalTask = await this.storage.getTaskById(id);
    if (!originalTask) {
      // TEST: updateTask throws error if task with ID does not exist
      throw new TaskNotFoundError(id);
    }

    // 2. Handle Parent Change (Re-parenting)
    // Check if parentTaskId is explicitly provided in the update AND is different from the current one
    if (
      updates.parentTaskId !== undefined &&
      updates.parentTaskId !== originalTask.parentTaskId
    ) {
      const newParentId = updates.parentTaskId; // Can be null
      const oldParentId = originalTask.parentTaskId;
      let newParentTask: Task | undefined;

      // 2a. Validate New Parent (if not null)
      if (newParentId !== null) {
        newParentTask = await this.storage.getTaskById(newParentId);
        if (!newParentTask) {
          // TEST: updateTask throws error if new parentTaskId does not exist
          throw new TaskNotFoundError(newParentId); // Or specific ParentNotFoundError
        }

        // 2b. Check for Circular Hierarchy
        // TEST: updateTask throws error when attempting to create a circular hierarchy
        const isCircular = await this.isCircularHierarchy(id, newParentId);
        if (isCircular) {
          throw new Error(
            `Setting parent to "${newParentId}" would create a circular hierarchy.`
          );
        }
      }

      // 2c. Update Old Parent's Children (if exists)
      if (oldParentId !== null && oldParentId !== undefined) {
        // Explicit check for string
        // Now oldParentId is definitely a string
        const oldParentTask = await this.storage.getTaskById(oldParentId);
        if (oldParentTask) {
          // Check if old parent still exists
          const filteredChildIds = oldParentTask.childTaskIds.filter(
            (childId: string) => childId !== id
          );
          // TEST: updateTask removes task ID from old parent's childTaskIds on re-parenting
          await this.storage.updateTask(oldParentId, {
            // oldParentId is confirmed string here
            childTaskIds: filteredChildIds,
          });
        }
        // If old parent doesn't exist, we can't update it, but proceed anyway.
      }

      // 2d. Update New Parent's Children (if exists)
      if (newParentTask) {
        // newParentTask is defined only if newParentId was not null and valid
        const updatedChildIds = [...newParentTask.childTaskIds, id];
        // TEST: updateTask adds task ID to new parent's childTaskIds on re-parenting
        await this.storage.updateTask(newParentId!, {
          // newParentId is non-null here
          childTaskIds: updatedChildIds,
        });
      }
    }

    // 3. Apply Updates via Storage
    //    - Storage layer handles setting updatedAt
    //    - Prevent direct modification of childTaskIds via updates; managed internally above
    const safeUpdates = { ...updates };
    // Explicitly delete childTaskIds from the user-provided updates object
    // before passing it to the storage layer.
    delete safeUpdates.childTaskIds;

    // TEST: updateTask successfully updates task fields (title, description, status, etc.)
    // TEST: updateTask correctly handles setting parentTaskId to null (making task top-level)
    const updatedTask = await this.storage.updateTask(id, safeUpdates);

    return updatedTask;
  }

  async deleteTask(id: string, cascade: boolean = false): Promise<boolean> {
    // PRECONDITIONS: id exists
    // POSTCONDITIONS: Task deleted. If cascade=false, parent's child list updated & children orphaned.
    //                 If cascade=true, parent's child list updated & all descendants deleted.
    //                 Returns true if initial task was found and attempt was made, false otherwise.

    // 1. Get Task to Delete
    const taskToDelete = await this.storage.getTaskById(id);
    if (!taskToDelete) {
      // TEST: deleteTask(id, false) returns false if task ID does not exist
      // TEST: deleteTask(id, true) returns false if task ID does not exist
      return false; // Task not found, nothing to delete
    }

    // 2. Update Parent's Child List (if has parent) - Do this regardless of cascade mode
    if (taskToDelete.parentTaskId != null) {
      // Check for null or undefined
      const parentTask = await this.storage.getTaskById(
        taskToDelete.parentTaskId
      );
      if (parentTask) {
        // Check if parent still exists
        const filteredChildIds = parentTask.childTaskIds.filter(
          (childId) => childId !== id
        );
        // TEST: deleteTask(id, false) removes the deleted task's ID from its parent's childTaskIds
        // TEST: deleteTask(id, true) removes the deleted task's ID from its parent's childTaskIds
        await this.storage.updateTask(parentTask.id, {
          childTaskIds: filteredChildIds,
        });
      }
      // If parent doesn't exist, log warning? Proceed anyway.
      // else { console.warn(`Parent task ${taskToDelete.parentTaskId} not found when deleting child ${id}.`); }
    }

    // 3. Handle Children based on cascade flag
    if (taskToDelete.childTaskIds && taskToDelete.childTaskIds.length > 0) {
      if (cascade === true) {
        // 3a. Cascade Delete: Recursively delete all children
        //     Use Promise.allSettled for better error handling if one child deletion fails
        // TEST: deleteTask(id, true) recursively calls deleteTask for all direct children with cascade=true
        const childDeletePromises = taskToDelete.childTaskIds.map(
          (childId) => this.deleteTask(childId, true) // Recursive call with cascade=true
        );
        const results = await Promise.allSettled(childDeletePromises);
        // Optional: Check results for failures and potentially throw an aggregate error
        const failedDeletions = results.filter((r) => r.status === 'rejected');
        if (failedDeletions.length > 0) {
          console.error(
            'Failed to cascade delete some children:',
            failedDeletions
          );
          // Depending on requirements, might throw an error here
        }
        // TEST: deleteTask(id, true) successfully deletes a task and all its descendants
      } else {
        // 3b. Orphan Children (Default): Update children's parentTaskId to null
        // TEST: deleteTask(id, false) sets parentTaskId to null for all direct children of the deleted task
        const childOrphanPromises = taskToDelete.childTaskIds.map((childId) =>
          this.storage
            .updateTask(childId, { parentTaskId: null }) // Set parent to null
            .catch((err) => {
              // Log error if a child update fails, but don't stop the overall delete
              console.error(
                `Failed to orphan child task ${childId} while deleting ${id}:`,
                err
              );
            })
        );
        await Promise.all(childOrphanPromises);
      }
    }

    // 4. Delete the Task itself via Storage
    //    This happens *after* handling children, especially in cascade mode
    // TEST: deleteTask(id, false) successfully removes the task from storage after orphaning children
    // TEST: deleteTask(id, true) successfully removes the task from storage after deleting children
    const deleted = await this.storage.deleteTask(id);

    return deleted; // Return status of deleting the *initial* task
  }

  // --- Subtask Methods (REMOVED) ---
  // Subtask logic is now handled via parentTaskId and childTaskIds

  // --- Dependency Methods ---

  async addTaskDependency(taskId: string, dependencyId: string): Promise<Task> {
    if (taskId === dependencyId) {
      throw new Error('A task cannot depend on itself.');
    }

    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task with ID "${taskId}" not found.`);
    }

    // Optional: Check if dependencyId actually exists as a task
    const dependencyTask = await this.getTask(dependencyId);
    if (!dependencyTask) {
      throw new Error(`Dependency task with ID "${dependencyId}" not found.`);
    }

    // Check for circular dependencies
    const circular = await this.isCircularDependency(taskId, dependencyId);
    if (circular) {
      throw new Error(
        `Adding dependency from ${taskId} to ${dependencyId} would create a circular dependency.`
      );
    }

    if (task.dependencies.includes(dependencyId)) {
      // Dependency already exists, return the task as is
      return task;
    }

    const updatedDependencies = [...task.dependencies, dependencyId];
    return this.updateTask(taskId, { dependencies: updatedDependencies });
  }

  async removeTaskDependency(
    taskId: string,
    dependencyId: string
  ): Promise<Task> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task with ID "${taskId}" not found.`);
    }

    // Check if dependencyId exists before attempting removal
    const dependencyTask = await this.getTask(dependencyId);
    if (!dependencyTask) {
      throw new TaskNotFoundError(dependencyId); // Throw error if dependency task doesn't exist
    }

    const initialLength = task.dependencies.length;
    const updatedDependencies = task.dependencies.filter(
      (depId) => depId !== dependencyId
    );

    if (updatedDependencies.length < initialLength) {
      // Dependency was found and removed
      return this.updateTask(taskId, { dependencies: updatedDependencies });
    } else {
      // Dependency not found, return the task as is
      return task;
    }
  }

  // --- Hierarchy Management ---

  async getTaskAncestors(id: string): Promise<Task[]> {
    // PRECONDITIONS: id exists
    // POSTCONDITIONS: Returns an array of ancestor tasks, from parent up to root

    const ancestors: Task[] = [];
    const currentTask = await this.getTask(id);
    if (!currentTask) {
      // TEST: getTaskAncestors throws error if task ID does not exist
      throw new TaskNotFoundError(id);
    }

    let parentId = currentTask.parentTaskId;
    while (parentId != null) {
      // Loop while parentId is a valid string
      const parentTask = await this.getTask(parentId);
      if (!parentTask) {
        // Data inconsistency: parentId exists but task doesn't. Log warning? Break?
        // TEST: getTaskAncestors handles missing intermediate ancestors gracefully (e.g., logs warning, stops)
        console.warn(
          `Data inconsistency: Parent task ${parentId} not found during ancestor lookup for task ${id}.`
        );
        break;
      }
      ancestors.push(parentTask);
      parentId = parentTask.parentTaskId; // Move up the chain
    }

    // TEST: getTaskAncestors returns an empty array for a top-level task
    // TEST: getTaskAncestors returns the correct list of ancestors in order (parent, grandparent, ...)
    return ancestors;
  }

  // async getTaskWithChildren(id: string, maxDepth: number = 1): Promise<Task | null> // Or a specific type TaskWithChildren
  // Implementation deferred as per instructions

  // --- Hierarchy Management ---

  // --- Other Potential Methods (from high-level plan) ---

  // async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> { ... }
  // async validateProjectDependencies(): Promise<ValidationResult> { ... }
  // async getNextTasksToWorkOn(): Promise<Task[]> { ... }
  // --- Helper/Validation Methods ---

  private async isCircularHierarchy(
    taskId: string,
    potentialParentId: string | null | undefined
  ): Promise<boolean> {
    // PRECONDITIONS: taskId and potentialParentId are valid IDs (or potentialParentId is null/undefined)
    // POSTCONDITIONS: Returns true if making potentialParentId the parent of taskId creates a cycle

    if (potentialParentId == null) {
      // TEST: isCircularHierarchy returns false if potential parent is null
      return false; // Cannot be circular if becoming a top-level task
    }

    if (taskId === potentialParentId) {
      // TEST: isCircularHierarchy returns true if potential parent is the task itself
      return true; // Task cannot be its own parent
    }

    // Start checking from the potential parent and go upwards
    let currentAncestorId: string | null | undefined = potentialParentId;
    while (currentAncestorId != null) {
      if (currentAncestorId === taskId) {
        // TEST: isCircularHierarchy returns true if potential parent is a descendant of the task
        return true; // Found the original task in its own ancestry path
      }

      const ancestorTask = await this.getTask(currentAncestorId);
      if (!ancestorTask) {
        // Should not happen if parent validation is done, but handle defensively
        // TEST: isCircularHierarchy handles missing intermediate ancestors gracefully (e.g., logs warning, stops)
        console.warn(
          `Data inconsistency: Ancestor task ${currentAncestorId} not found during circular check for task ${taskId}.`
        );
        return false; // Cannot determine cycle if ancestor is missing
      }

      currentAncestorId = ancestorTask.parentTaskId; // Move up
    }

    // TEST: isCircularHierarchy returns false if potential parent is valid (ancestor or unrelated)
    return false; // Reached the root without finding the original task
  }

  /**
   * Checks if adding a dependency from taskId to potentialDependencyId would create a cycle.
   * Performs a Depth-First Search starting from the potential dependency.
   * @param taskId The ID of the task that would depend on potentialDependencyId.
   * @param potentialDependencyId The ID of the task that taskId would depend on.
   * @returns True if a cycle is detected, false otherwise.
   */
  private async isCircularDependency(
    taskId: string,
    potentialDependencyId: string
  ): Promise<boolean> {
    const visited = new Set<string>(); // Keep track of visited nodes in the current path
    const checked = new Set<string>(); // Keep track of nodes whose subgraphs have been fully checked

    // Recursive DFS function
    const checkCycle = async (currentTaskId: string): Promise<boolean> => {
      visited.add(currentTaskId);
      checked.add(currentTaskId); // Mark as checked for this overall check

      const task = await this.getTask(currentTaskId);
      if (!task) {
        // If a task in the chain doesn't exist, we can't confirm a cycle through it.
        // This might indicate data inconsistency, but doesn't confirm a cycle here.
        console.warn(
          `Task ${currentTaskId} not found during circular dependency check.`
        );
        return false;
      }

      for (const depId of task.dependencies) {
        if (depId === taskId) {
          return true; // Cycle detected: Found the original task we're trying to add the dependency to
        }
        if (visited.has(depId)) {
          // Found a node already in the current path - this indicates a cycle,
          // though not necessarily involving the *original* taskId directly.
          // Depending on strictness, you might return true here.
          // For this check, we only care if the *original* taskId is reached.
          // console.warn(`Cycle detected involving ${depId} (not necessarily original task ${taskId})`);
          continue; // Continue checking other branches
        }
        if (!checked.has(depId)) {
          // Only recurse if this node's subgraph hasn't been fully checked yet
          if (await checkCycle(depId)) {
            return true; // Cycle found deeper in the recursion
          }
        }
      }

      visited.delete(currentTaskId); // Remove from current path when backtracking
      return false; // No cycle found starting from this node in this path
    };

    // Start the check from the task that *would be depended upon*
    return checkCycle(potentialDependencyId);
  }
  // TEST: isCircularDependency detects direct cycles (A -> B, B -> A)
  // TEST: isCircularDependency detects indirect cycles (A -> B -> C -> A)
  // TEST: isCircularDependency returns false when no cycle exists
}
