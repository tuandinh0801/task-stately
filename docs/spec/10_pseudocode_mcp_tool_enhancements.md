# Phase 10: MCP Tool Enhancements - Pseudocode

## 1. Introduction

This document outlines the pseudocode design for enhancing the `getTask` and `listTasks` MCP tools within the `task-stately` project. The goal is to add options to include the titles of child tasks and dependency tasks in the tool responses.

## 2. `getTask` Tool Enhancements

### 2.1. Updated Input Schema

The input schema for `getTask` will be extended to include optional boolean flags for showing children and dependencies.

```pseudocode
// Zod-like Schema Definition for getTask Parameters
Schema GetTaskParams:
  id: String (non-empty) - Description: "Task ID to retrieve"
  projectRoot: String - Description: "Absolute path to the project root directory on the client."
  showChildren: Boolean (optional, default: false) - Description: "If true, include the titles of direct child tasks."
  showDependencies: Boolean (optional, default: false) - Description: "If true, include the titles of tasks this task depends on."
End Schema
```

### 2.2. Pseudocode for `execute` Function

```pseudocode
FUNCTION execute_getTask(params: GetTaskParams) RETURNS ContentResult

  // Input Validation (Handled by FastMCP based on schema)
  id = params.id
  projectRoot = params.projectRoot
  showChildren = params.showChildren OR false // Default to false if undefined
  showDependencies = params.showDependencies OR false // Default to false if undefined

  TRY
    // Instantiate TaskManager dynamically
    storageAdapter = new JsonFileTaskStorage(projectRoot)
    taskManager = new TaskManager(storageAdapter)

    // Fetch the main task
    task = taskManager.getTask(id)

    // TEST: Handle task not found
    IF task IS NULL THEN
      THROW TaskNotFoundError(id)
    END IF

    // Initialize response object
    // NOTE: Use a type that allows adding optional fields later
    responseObject = ConvertTaskToPlainObject(task) // Base task data

    // Fetch all tasks ONCE if needed for children or dependencies to optimize
    allTasks = NULL
    taskMapById = NULL
    IF showChildren OR showDependencies THEN
      allTasks = taskManager.getAllTasks()
      // Create a map for efficient lookups
      taskMapById = CreateMapFromList(allTasks, key="id")
      // TEST: Ensure all tasks are fetched correctly when needed.
    END IF

    // Include children titles if requested
    IF showChildren THEN
      childrenTitles = []
      FOR each potentialChild IN allTasks WHERE potentialChild.parentId == id
        APPEND potentialChild.title TO childrenTitles
      END FOR
      responseObject.childrenTitles = childrenTitles
      // TEST: Correctly fetches and includes children titles when showChildren is true.
      // TEST: Returns empty array when no children exist and showChildren is true.
    END IF

    // Include dependency titles if requested
    IF showDependencies THEN
      dependsOnTitles = []
      FOR each dependencyId IN task.dependencies
        dependencyTask = taskMapById.get(dependencyId)
        IF dependencyTask IS NOT NULL THEN
          APPEND dependencyTask.title TO dependsOnTitles
        ELSE
          APPEND "Unknown Task (ID: " + dependencyId + ")" TO dependsOnTitles
          // TEST: Handles unknown dependency IDs gracefully.
        END IF
      END FOR
      responseObject.dependsOnTitles = dependsOnTitles
      // TEST: Correctly fetches and includes dependency titles when showDependencies is true.
      // TEST: Returns empty array when no dependencies exist and showDependencies is true.
    END IF

    // TEST: Returns only base task data when both showChildren and showDependencies are false.

    // Serialize the final response object to JSON
    jsonResponse = JSON.stringify(responseObject, pretty=true)

    // Return success ContentResult
    RETURN CreateContentResult(isError=false, textContent=jsonResponse)

  CATCH TaskNotFoundError as error
    // Re-throw specific error for FastMCP
    THROW error
  CATCH AnyError as error
    // Log unexpected errors
    LOG_ERROR("Unexpected error in getTask tool for ID " + id + ": " + error.message)
    // Throw a generic error for FastMCP
    THROW new Error("An unexpected error occurred while retrieving task " + id + ".")
  END TRY

END FUNCTION
```

## 3. `listTasks` Tool Enhancements

### 3.1. Updated Input Schema

The input schema for `listTasks` will be extended to include an optional boolean flag for showing children. The `showDependencies` flag already exists.

```pseudocode
// Zod-like Schema Definition for listTasks Parameters
Schema ListTasksParams:
  status: String (optional, enum: TaskStatus values) - Description: "Filter tasks by status"
  type: String (optional, enum: TaskType values) - Description: "Filter tasks by type"
  showDependencies: Boolean (optional, default: false) - Description: "If true, include the titles of tasks that each listed task depends on."
  showChildren: Boolean (optional, default: false) - Description: "If true, include the titles of direct child tasks for each listed task."
  projectRoot: String - Description: "Absolute path to the project root directory on the client."
End Schema
```

### 3.2. Pseudocode for `execute` Function

```pseudocode
FUNCTION execute_listTasks(params: ListTasksParams) RETURNS ContentResult

  // Input Validation (Handled by FastMCP based on schema)
  statusFilter = params.status
  typeFilter = params.type
  showDependencies = params.showDependencies OR false // Default to false
  showChildren = params.showChildren OR false // Default to false
  projectRoot = params.projectRoot

  TRY
    // Instantiate TaskManager dynamically
    storageAdapter = new JsonFileTaskStorage(projectRoot)
    taskManager = new TaskManager(storageAdapter)

    // Fetch all tasks
    allTasks = taskManager.getAllTasks()

    // Apply filters
    filteredTasks = allTasks
    IF statusFilter IS NOT NULL THEN
      filteredTasks = FilterList(filteredTasks, item => item.status == statusFilter)
    END IF
    IF typeFilter IS NOT NULL THEN
      filteredTasks = FilterList(filteredTasks, item => item.type == typeFilter)
    END IF

    // TEST: Handle no tasks found after filtering.
    IF IsEmpty(filteredTasks) THEN
      RETURN CreateContentResult(isError=false, textContent="[]")
    END IF

    // Prepare response data structure (list of objects)
    responseData = []

    // Fetch auxiliary data ONCE if needed for children or dependencies
    taskMapById = NULL
    parentToChildrenMap = NULL // Map<parentId, List<childTitle>>
    IF showChildren OR showDependencies THEN
      taskMapById = CreateMapFromList(allTasks, key="id")
      // TEST: Ensure task map is created correctly when needed.
    END IF
    IF showChildren THEN
      parentToChildrenMap = CreateMap() // Initialize empty map
      FOR each task IN allTasks
        IF task.parentId IS NOT NULL THEN
          IF NOT parentToChildrenMap.containsKey(task.parentId) THEN
            parentToChildrenMap.set(task.parentId, [])
          END IF
          parentToChildrenMap.get(task.parentId).append(task.title)
        END IF
      END FOR
      // TEST: Ensure parent-to-children map is built correctly.
    END IF


    // Process each filtered task
    FOR each task IN filteredTasks
      taskObject = ConvertTaskToPlainObject(task) // Base task data

      // Include dependency titles if requested
      IF showDependencies THEN
        dependsOnTitles = []
        FOR each dependencyId IN task.dependencies
          dependencyTask = taskMapById.get(dependencyId)
          IF dependencyTask IS NOT NULL THEN
            APPEND dependencyTask.title TO dependsOnTitles
          ELSE
            APPEND "Unknown Task (ID: " + dependencyId + ")" TO dependsOnTitles
          END IF
        END FOR
        taskObject.dependsOnTitles = dependsOnTitles
        // TEST: Correctly includes dependency titles when showDependencies is true (existing functionality check).
      END IF

      // Include children titles if requested
      IF showChildren THEN
        childrenTitles = parentToChildrenMap.get(task.id) OR [] // Get titles or empty list
        taskObject.childrenTitles = childrenTitles
        // TEST: Correctly includes children titles when showChildren is true.
        // TEST: Returns empty array for tasks with no children when showChildren is true.
      END IF

      APPEND taskObject TO responseData
    END FOR

    // TEST: Returns correct data when only showDependencies is true.
    // TEST: Returns correct data when only showChildren is true.
    // TEST: Returns correct data when both are true.
    // TEST: Returns correct data when both are false.

    // Serialize the final response data to JSON
    jsonResponse = JSON.stringify(responseData, pretty=true)

    // Return success ContentResult
    RETURN CreateContentResult(isError=false, textContent=jsonResponse)

  CATCH AnyError as error
    // Log unexpected errors
    LOG_ERROR("Error in listTasks tool: " + error.message)
    // Throw a generic error for FastMCP
    THROW new Error("An unexpected error occurred while listing tasks.")
  END TRY

END FUNCTION
```

## 4. Constraints & Considerations

*   **Performance:** The pseudocode aims to fetch `allTasks` only once per execution if either `showChildren` or `showDependencies` is true, improving efficiency compared to multiple fetches.
*   **Data Structure:** The added fields will be `childrenTitles: string[]` and `dependsOnTitles: string[]`.
*   **Error Handling:** Specific errors like `TaskNotFoundError` should be propagated, while generic errors are caught and reported.
*   **Modularity:** The core logic relies on the `TaskManager` and `StorageAdapter`, maintaining separation of concerns.
*   **Clarity:** Helper functions like `ConvertTaskToPlainObject`, `CreateMapFromList`, `FilterList`, `IsEmpty`, `CreateContentResult` are assumed for brevity.