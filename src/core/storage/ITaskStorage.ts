import { Task, TaskStatus, TaskPriority, TaskType } from '@/types/task'; // Removed Subtask

// Helper type for data needed to create a new task.
// Only includes fields that a user should provide.
// Defaults for status, priority, type, etc., are handled by the addTask implementation.
export type NewTaskData = {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  complexity?: number;
  acceptanceCriteria?: string[];
  artifacts?: string[];
  tags?: string[];
  assignee?: string;
  parentTaskId?: string | null; // Added for hierarchy
  // Explicitly exclude fields handled internally: id, createdAt, updatedAt, childTaskIds, dependencies
};

// Helper type for data allowed when updating a task
// Allows partial updates, omits fields that shouldn't be directly updatable (id, createdAt)
// Note: childTaskIds is *allowed* here for internal TaskManager updates,
// but the public updateTask method should prevent users from setting it directly.
export type UpdateTaskData = Partial<Omit<Task, 'id' | 'createdAt'>>; // Removed 'childTaskIds' from Omit

// Removed NewSubtaskData and UpdateSubtaskData


export interface ITaskStorage {
  /**
   * Optional initialization logic (e.g., ensure directory exists).
   */
  initialize?(): Promise<void>;

  /**
   * Loads all tasks from the storage.
   * @returns A promise resolving to an array of tasks.
   */
  loadTasks(): Promise<Task[]>;

  /**
   * Saves all tasks, overwriting the previous state.
   * Used when the TaskManager has the complete, modified list.
   * @param tasks The array of tasks to save.
   * @returns A promise resolving when saving is complete.
   */
  saveTasks(tasks: Task[]): Promise<void>;

  /**
   * Retrieves a single task by its ID.
   * @param id The ID of the task to retrieve.
   * @returns A promise resolving to the task or undefined if not found.
   */
  getTaskById(id: string): Promise<Task | undefined>;

  /**
   * Adds a new task to the storage.
   * Handles ID generation and timestamping.
   * @param taskData The data for the new task.
   * @returns A promise resolving to the newly created task.
   */
  addTask(taskData: NewTaskData): Promise<Task>;

  /**
   * Updates an existing task.
   * Merges the updates with the existing task data and updates the timestamp.
   * @param id The ID of the task to update.
   * @param updates A partial object containing the fields to update.
   * @returns A promise resolving to the updated task.
   * @throws Error if the task with the given ID is not found.
   */
  updateTask(id: string, updates: UpdateTaskData): Promise<Task>;

  /**
   * Deletes a task from the storage.
   * @param id The ID of the task to delete.
   * @returns A promise resolving to true if the task was deleted, false otherwise.
   */
  deleteTask(id: string): Promise<boolean>;

  /**
   * Gets the next available ID for a new task.
   * Note: The implementation using this might need to handle saving the updated last ID.
   * @returns A promise resolving to the next task ID as a string.
   */
  getNextId(): Promise<string>;

  /**
   * Optional cleanup logic (e.g., close file handles).
   */
  dispose?(): Promise<void>;
}