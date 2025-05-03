# Pseudocode: TaskManager for Hierarchical Tasks

## 1. Overview

This document provides pseudocode for the `TaskManager` class, adapting its methods to support the unified, hierarchical task structure defined in `docs/spec/3_domain_model_hierarchical_tasks.md`. It includes modifications to existing methods and introduces new logic for managing parent-child relationships and ensuring hierarchy integrity.

## 2. TaskManager Pseudocode

```typescript
// Import necessary types (Task, NewTaskData, UpdateTaskData, ITaskStorage, TaskNotFoundError)
// Import validation utilities (e.g., for circular dependency checks)

CLASS TaskManager:
    PRIVATE storage: ITaskStorage

    CONSTRUCTOR(storage: ITaskStorage):
        this.storage = storage
        // Initialization logic if needed

    // --- Core CRUD Modifications ---

    ASYNC FUNCTION createTask(taskData: NewTaskData): Task
        // PRECONDITIONS: taskData is valid NewTaskData
        // POSTCONDITIONS: Task is created, parent's child list updated (if applicable), created task returned

        // 1. Validate Parent Existence (if parentTaskId provided)
        IF taskData.parentTaskId IS NOT NULL:
            parentTask = AWAIT this.storage.getTaskById(taskData.parentTaskId)
            IF parentTask IS NULL:
                THROW new TaskNotFoundError(taskData.parentTaskId) // Or specific ParentNotFoundError
            // TEST: createTask throws error if parentTaskId is provided but parent doesn't exist

        // 2. Create the Task via Storage
        //    - Storage layer (`addTask`) is responsible for:
        //        - Reading `meta.lastTaskId`.
        //        - Incrementing `meta.lastTaskId`.
        //        - Assigning the new ID (as a string) to the task.
        //        - Setting `createdAt`, `updatedAt`.
        //        - Initializing `childTaskIds` to [].
        //        - Saving the new task and updated `meta`.
        newTask = AWAIT this.storage.addTask(taskData)
        // TEST: createTask successfully creates a task with valid data
        // TEST: createTask delegates ID generation (global sequential string) to the storage layer
        // TEST: createTask correctly sets default values (status, priority, type) if not provided
        // TEST: createTask initializes childTaskIds as an empty array via storage layer

        // 3. Update Parent's Child List (if parentTaskId provided)
        IF taskData.parentTaskId IS NOT NULL AND parentTask IS NOT NULL:
            // Ensure newTask.id is available after storage.addTask completes
            updatedChildIds = [...parentTask.childTaskIds, newTask.id]
            AWAIT this.storage.updateTask(parentTask.id, { childTaskIds: updatedChildIds })
            // TEST: createTask adds the new task's ID to the parent's childTaskIds list

        RETURN newTask

    ASYNC FUNCTION getTask(id: string): Task | undefined
        // PRECONDITIONS: id is a string
        // POSTCONDITIONS: Returns task if found, otherwise undefined
        task = AWAIT this.storage.getTaskById(id)
        // TEST: getTask returns the correct task for a valid ID
        // TEST: getTask returns undefined for a non-existent ID
        RETURN task

    ASYNC FUNCTION getAllTasks(): Task[]
        // PRECONDITIONS: None
        // POSTCONDITIONS: Returns an array of all tasks
        tasks = AWAIT this.storage.loadTasks()
        // TEST: getAllTasks returns all tasks from storage
        RETURN tasks

    ASYNC FUNCTION updateTask(id: string, updates: UpdateTaskData): Task
        // PRECONDITIONS: id exists, updates is valid UpdateTaskData
        // POSTCONDITIONS: Task is updated, hierarchy integrity maintained, updated task returned

        // 1. Get Original Task
        originalTask = AWAIT this.storage.getTaskById(id)
        IF originalTask IS NULL:
            THROW new TaskNotFoundError(id)
        // TEST: updateTask throws error if task with ID does not exist

        // 2. Handle Parent Change (Re-parenting)
        IF updates.parentTaskId IS DEFINED AND updates.parentTaskId !== originalTask.parentTaskId:
            newParentId = updates.parentTaskId
            oldParentId = originalTask.parentTaskId

            // 2a. Validate New Parent (if not null)
            IF newParentId IS NOT NULL:
                newParentTask = AWAIT this.storage.getTaskById(newParentId)
                IF newParentTask IS NULL:
                    THROW new TaskNotFoundError(newParentId) // Or specific ParentNotFoundError
                // TEST: updateTask throws error if new parentTaskId does not exist

                // 2b. Check for Circular Hierarchy
                isCircular = AWAIT this.isCircularHierarchy(id, newParentId)
                IF isCircular:
                    THROW new Error("Setting this parent would create a circular hierarchy.")
                // TEST: updateTask throws error when attempting to create a circular hierarchy

            // 2c. Update Old Parent's Children (if exists)
            IF oldParentId IS NOT NULL:
                oldParentTask = AWAIT this.storage.getTaskById(oldParentId)
                IF oldParentTask IS NOT NULL: // Check if old parent still exists
                    filteredChildIds = oldParentTask.childTaskIds.filter(childId => childId !== id)
                    AWAIT this.storage.updateTask(oldParentId, { childTaskIds: filteredChildIds })
                    // TEST: updateTask removes task ID from old parent's childTaskIds on re-parenting

            // 2d. Update New Parent's Children (if exists)
            IF newParentId IS NOT NULL AND newParentTask IS NOT NULL:
                updatedChildIds = [...newParentTask.childTaskIds, id]
                AWAIT this.storage.updateTask(newParentId, { childTaskIds: updatedChildIds })
                // TEST: updateTask adds task ID to new parent's childTaskIds on re-parenting

        // 3. Apply Updates via Storage
        //    - Storage layer handles setting updatedAt
        //    - Prevent direct modification of childTaskIds via updates; managed internally
        safeUpdates = { ...updates }
        DELETE safeUpdates.childTaskIds // Ensure childTaskIds isn't directly modified by user update

        updatedTask = AWAIT this.storage.updateTask(id, safeUpdates)
        // TEST: updateTask successfully updates task fields (title, description, status, etc.)
        // TEST: updateTask correctly handles setting parentTaskId to null (making task top-level)

        RETURN updatedTask

    ASYNC FUNCTION deleteTask(id: string, cascade: boolean = false): boolean
        // PRECONDITIONS: id exists
        // POSTCONDITIONS: Task deleted. If cascade=false, parent's child list updated & children orphaned.
        //                 If cascade=true, parent's child list updated & all descendants deleted.
        //                 Returns true if initial task was found and attempt was made, false otherwise.

        // 1. Get Task to Delete
        taskToDelete = AWAIT this.storage.getTaskById(id)
        IF taskToDelete IS NULL:
            RETURN false // Task not found, nothing to delete
        // TEST: deleteTask(id, false) returns false if task ID does not exist
        // TEST: deleteTask(id, true) returns false if task ID does not exist

        // 2. Update Parent's Child List (if has parent) - Do this regardless of cascade mode
        IF taskToDelete.parentTaskId IS NOT NULL:
            parentTask = AWAIT this.storage.getTaskById(taskToDelete.parentTaskId)
            IF parentTask IS NOT NULL: // Check if parent still exists
                filteredChildIds = parentTask.childTaskIds.filter(childId => childId !== id)
                AWAIT this.storage.updateTask(parentTask.id, { childTaskIds: filteredChildIds })
                // TEST: deleteTask(id, false) removes the deleted task's ID from its parent's childTaskIds
                // TEST: deleteTask(id, true) removes the deleted task's ID from its parent's childTaskIds

        // 3. Handle Children based on cascade flag
        IF taskToDelete.childTaskIds.length > 0:
            IF cascade IS true:
                // 3a. Cascade Delete: Recursively delete all children
                //     Use Promise.allSettled for better error handling if one child deletion fails
                childDeletePromises = taskToDelete.childTaskIds.map(childId =>
                    this.deleteTask(childId, true) // Recursive call with cascade=true
                )
                results = AWAIT Promise.allSettled(childDeletePromises)
                // Optional: Check results for failures and potentially throw an aggregate error
                // TEST: deleteTask(id, true) recursively calls deleteTask for all direct children with cascade=true
                // TEST: deleteTask(id, true) successfully deletes a task and all its descendants
            ELSE:
                // 3b. Orphan Children (Default): Update children's parentTaskId to null
                childOrphanPromises = taskToDelete.childTaskIds.map(childId =>
                    this.storage.updateTask(childId, { parentTaskId: null }) // Set parent to null
                    // Note: Error handling for child updates might be needed
                )
                AWAIT Promise.all(childOrphanPromises)
                // TEST: deleteTask(id, false) sets parentTaskId to null for all direct children of the deleted task

        // 4. Delete the Task itself via Storage
        //    This happens *after* handling children, especially in cascade mode
        deleted = AWAIT this.storage.deleteTask(id)
        // TEST: deleteTask(id, false) successfully removes the task from storage after orphaning children
        // TEST: deleteTask(id, true) successfully removes the task from storage after deleting children

        RETURN deleted // Return status of deleting the *initial* task

    // --- Hierarchy Management ---

    ASYNC FUNCTION getTaskWithChildren(id: string, maxDepth: number = 1): Promise<Task | null> // Or a specific type TaskWithChildren
        // PRECONDITIONS: id exists
        // POSTCONDITIONS: Returns task with nested children up to maxDepth
        // NOTE: This is potentially complex and performance-intensive.
        //       A simpler approach might just return the task and its direct children IDs.
        //       For full nesting, recursive calls or optimized storage queries are needed.

        task = AWAIT this.getTask(id)
        IF task IS NULL:
            RETURN null
        // TEST: getTaskWithChildren returns null if task ID does not exist

        IF maxDepth <= 0 OR task.childTaskIds.length === 0:
            RETURN task // Return task without fetching children if depth limit reached or no children

        // Fetch children recursively (simplified example)
        children = []
        FOR childId IN task.childTaskIds:
            child = AWAIT this.getTaskWithChildren(childId, maxDepth - 1)
            IF child IS NOT NULL:
                children.push(child)

        // Return task with populated children (structure depends on desired return type)
        // Example: return { ...task, children: children }
        // TEST: getTaskWithChildren returns the task with its direct children when maxDepth is 1
        // TEST: getTaskWithChildren returns nested children up to the specified maxDepth
        // TEST: getTaskWithChildren handles maxDepth of 0 correctly (returns task only)
        RETURN { ...task, children: children } // Placeholder structure

    ASYNC FUNCTION getTaskAncestors(id: string): Promise<Task[]>
        // PRECONDITIONS: id exists
        // POSTCONDITIONS: Returns an array of ancestor tasks, from parent up to root

        ancestors = []
        currentTask = AWAIT this.getTask(id)
        IF currentTask IS NULL:
            THROW new TaskNotFoundError(id)
        // TEST: getTaskAncestors throws error if task ID does not exist

        parentId = currentTask.parentTaskId
        WHILE parentId IS NOT NULL:
            parentTask = AWAIT this.getTask(parentId)
            IF parentTask IS NULL:
                // Data inconsistency: parentId exists but task doesn't. Log warning? Break?
                BREAK
            ancestors.push(parentTask)
            parentId = parentTask.parentTaskId // Move up the chain

        // TEST: getTaskAncestors returns an empty array for a top-level task
        // TEST: getTaskAncestors returns the correct list of ancestors in order (parent, grandparent, ...)
        // TEST: getTaskAncestors handles missing intermediate ancestors gracefully (e.g., logs warning, stops)
        RETURN ancestors

    // --- Dependency Management (Largely Unchanged, but ensure IDs are valid) ---

    ASYNC FUNCTION addTaskDependency(taskId: string, dependencyId: string): Promise<Task>
        // PRECONDITIONS: taskId and dependencyId exist, taskId !== dependencyId
        // POSTCONDITIONS: dependencyId added to taskId's dependencies, updated task returned

        IF taskId === dependencyId:
            THROW new Error('A task cannot depend on itself.')
        // TEST: addTaskDependency throws error if taskId and dependencyId are the same

        task = AWAIT this.getTask(taskId)
        IF task IS NULL:
            THROW new TaskNotFoundError(taskId)
        // TEST: addTaskDependency throws error if taskId does not exist

        dependencyTask = AWAIT this.getTask(dependencyId)
        IF dependencyTask IS NULL:
            THROW new TaskNotFoundError(dependencyId)
        // TEST: addTaskDependency throws error if dependencyId does not exist

        // Optional: Check for circular *task* dependencies (A -> B -> A) - separate from hierarchy
        // isCircularDep = AWAIT this.isCircularDependency(taskId, dependencyId)
        // IF isCircularDep: THROW new Error("Adding this dependency would create a circular dependency.")
        // TEST: addTaskDependency throws error if adding the dependency creates a cycle

        IF task.dependencies.includes(dependencyId):
            RETURN task // Already exists
        // TEST: addTaskDependency returns task unchanged if dependency already exists

        updatedDependencies = [...task.dependencies, dependencyId]
        RETURN AWAIT this.updateTask(taskId, { dependencies: updatedDependencies })
        // TEST: addTaskDependency successfully adds dependencyId to task's dependencies list

    ASYNC FUNCTION removeTaskDependency(taskId: string, dependencyId: string): Promise<Task>
        // PRECONDITIONS: taskId exists
        // POSTCONDITIONS: dependencyId removed from taskId's dependencies, updated task returned

        task = AWAIT this.getTask(taskId)
        IF task IS NULL:
            THROW new TaskNotFoundError(taskId)
        // TEST: removeTaskDependency throws error if taskId does not exist

        initialLength = task.dependencies.length
        updatedDependencies = task.dependencies.filter(depId => depId !== dependencyId)

        IF updatedDependencies.length < initialLength:
            RETURN AWAIT this.updateTask(taskId, { dependencies: updatedDependencies })
            // TEST: removeTaskDependency successfully removes dependencyId from task's dependencies list
        ELSE:
            RETURN task // Dependency not found
            // TEST: removeTaskDependency returns task unchanged if dependency does not exist

    // --- Helper/Validation Methods ---

    PRIVATE ASYNC FUNCTION isCircularHierarchy(taskId: string, potentialParentId: string): Promise<boolean>
        // PRECONDITIONS: taskId and potentialParentId are valid IDs (or potentialParentId is null)
        // POSTCONDITIONS: Returns true if making potentialParentId the parent of taskId creates a cycle

        IF potentialParentId IS NULL:
            RETURN false // Cannot be circular if becoming a top-level task

        // Start checking from the potential parent and go upwards
        currentAncestorId = potentialParentId
        WHILE currentAncestorId IS NOT NULL:
            IF currentAncestorId === taskId:
                RETURN true // Found the original task in its own ancestry path

            ancestorTask = AWAIT this.getTask(currentAncestorId)
            IF ancestorTask IS NULL:
                // Should not happen if parent validation is done, but handle defensively
                RETURN false // Cannot determine cycle if ancestor is missing

            currentAncestorId = ancestorTask.parentTaskId // Move up

        RETURN false // Reached the root without finding the original task
        // TEST: isCircularHierarchy returns true if potential parent is the task itself
        // TEST: isCircularHierarchy returns true if potential parent is a descendant of the task
        // TEST: isCircularHierarchy returns false if potential parent is valid (ancestor or unrelated)
        // TEST: isCircularHierarchy returns false if potential parent is null

    // PRIVATE ASYNC FUNCTION isCircularDependency(taskId: string, potentialDependencyId: string): Promise<boolean>
        // Implementation for checking task dependencies (A -> B -> C -> A)
        // Requires graph traversal (DFS or BFS) starting from potentialDependencyId
        // TEST: isCircularDependency detects direct cycles (A -> B, B -> A)
        // TEST: isCircularDependency detects indirect cycles (A -> B -> C -> A)
        // TEST: isCircularDependency returns false when no cycle exists

END CLASS
```

## 3. Key Changes & Considerations

1.  **Subtask Methods Removed:** `addSubtask`, `updateSubtask`, `removeSubtask` are gone. Hierarchy is managed via `parentTaskId` and `childTaskIds` on the `Task` object itself.
2.  **`createTask` Updates:** Now checks for parent existence and updates the parent's `childTaskIds` list.
3.  **`updateTask` Updates:** Includes logic for re-parenting: validating the new parent, checking for circular hierarchies using `isCircularHierarchy`, updating old and new parent's `childTaskIds`. Prevents direct user modification of `childTaskIds`.
4.  **`deleteTask` Updates:** Removes the task ID from its parent's `childTaskIds` and orphans its own children by setting their `parentTaskId` to `null`.
5.  **Hierarchy Helpers:** Added pseudocode for `getTaskWithChildren` (potentially complex, needs careful implementation) and `getTaskAncestors`.
6.  **Circular Hierarchy Check:** Introduced `isCircularHierarchy` helper to prevent invalid parent assignments during updates.
7.  **Dependency Management:** Methods remain similar but rely on the updated `getTask` and `updateTask`. Circular _task_ dependency checking (`isCircularDependency`) is noted as a separate, optional complexity.
8.  **Storage Interaction:** Assumes the `ITaskStorage` interface and its implementation (`JsonFileTaskStorage`) will be updated to handle the new `Task` schema (including `parentTaskId`, `childTaskIds`) and potentially new methods if needed for optimized hierarchy queries.
9.  **TDD Anchors:** Included `// TEST:` comments for key behaviors and edge cases to guide test development.
