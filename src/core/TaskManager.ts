import { omit } from 'lodash'
import {
  ITaskStorage,
  NewTaskData,
  UpdateTaskData,
  NewSubtaskData,
  UpdateSubtaskData,
} from '@/core/storage/ITaskStorage';
import { Task, Subtask, TaskStatusSchema, SubtaskSchema } from '@/types/task'; // Added SubtaskSchema
import { v4 as uuidv4 } from 'uuid'; // Using UUID for subtask IDs for robustness

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
    // Future: Add validation using Zod schemas if needed beyond storage layer
    // Future: Add business logic (e.g., checking permissions, triggering notifications)
    return this.storage.addTask(taskData);
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
    // Future: Add validation of updates (e.g., allowed status transitions)
    // Future: Add business logic (e.g., updating related tasks, notifications)

    // Ensure the task exists before attempting update (storage might throw, but good practice)
    const existingTask = await this.getTask(id);
    if (!existingTask) {
        throw new Error(`Task with ID "${id}" not found.`);
    }

    // Prevent changing immutable fields if necessary (though UpdateTaskData type already handles this)
    const safeUpdates = { ...updates };
    // No need to delete id or createdAt as they are not part of UpdateTaskData type

    return this.storage.updateTask(id, safeUpdates);
  }

  async deleteTask(id: string): Promise<boolean> {
    // Future: Add business logic (e.g., check if task is depended upon, archive instead of delete)

    // Ensure the task exists before attempting delete
    const existingTask = await this.getTask(id);
    if (!existingTask) {
        // Or return false if preferred semantics are "was deletion successful?"
        throw new Error(`Task with ID "${id}" not found.`);
    }

    // Future: Check dependencies - prevent deletion if other tasks depend on this one?
    // const tasks = await this.getAllTasks();
    // const dependents = tasks.filter(task => task.dependencies.includes(id));
    // if (dependents.length > 0) {
    //   throw new Error(`Cannot delete task "${id}" as tasks ${dependents.map(t => t.id).join(', ')} depend on it.`);
    // }

    return this.storage.deleteTask(id);
  }

  // --- Subtask Methods ---

  async addSubtask(taskId: string, subtaskData: NewSubtaskData): Promise<Subtask> {
    const parentTask = await this.getTask(taskId);
    if (!parentTask) {
      throw new Error(`Parent task with ID "${taskId}" not found.`);
    }

    const now = new Date().toISOString();
    // Using UUID for subtask IDs is more robust than index-based IDs
    const newSubtaskId = uuidv4();

    const newSubtask: Subtask = {
      ...subtaskData,
      id: newSubtaskId,
      status: subtaskData.status ?? TaskStatusSchema.Enum.pending,
      createdAt: now,
      updatedAt: now,
    };

    // Validate the new subtask
    SubtaskSchema.parse(newSubtask);

    const updatedSubtasks = [...parentTask.subtasks, newSubtask];

    // Update the parent task with the new subtasks array
    await this.updateTask(taskId, { subtasks: updatedSubtasks });

    return newSubtask;
  }

  async updateSubtask(
    taskId: string,
    subtaskId: string,
    updates: UpdateSubtaskData
  ): Promise<Subtask> {
    const parentTask = await this.getTask(taskId);
    if (!parentTask) {
      throw new Error(`Parent task with ID "${taskId}" not found.`);
    }

    const subtaskIndex = parentTask.subtasks.findIndex(sub => sub.id === subtaskId);
    if (subtaskIndex === -1) {
      throw new Error(`Subtask with ID "${subtaskId}" not found in task "${taskId}".`);
    }

    const originalSubtask = parentTask.subtasks[subtaskIndex];
    const updatedSubtask: Subtask = {
      ...originalSubtask,
      ...updates,
      id: originalSubtask.id, // Ensure ID doesn't change
      createdAt: originalSubtask.createdAt, // Ensure createdAt doesn't change
      updatedAt: new Date().toISOString(),
    };

    // Validate the updated subtask
    SubtaskSchema.parse(updatedSubtask);

    const updatedSubtasks = [...parentTask.subtasks];
    updatedSubtasks[subtaskIndex] = updatedSubtask;

    // Update the parent task
    await this.updateTask(taskId, { subtasks: updatedSubtasks });

    return updatedSubtask;
  }

  async removeSubtask(taskId: string, subtaskId: string): Promise<boolean> {
    const parentTask = await this.getTask(taskId);
    if (!parentTask) {
      throw new Error(`Parent task with ID "${taskId}" not found.`);
    }

    const initialLength = parentTask.subtasks.length;
    const updatedSubtasks = parentTask.subtasks.filter(sub => sub.id !== subtaskId);

    if (updatedSubtasks.length < initialLength) {
      // Subtask was found and removed
      await this.updateTask(taskId, { subtasks: updatedSubtasks });
      return true;
    } else {
      // Subtask not found, nothing changed
      return false;
    }
  }

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

    // Optional: Check for circular dependencies (more complex, skip for now)

    if (task.dependencies.includes(dependencyId)) {
      // Dependency already exists, return the task as is
      return task;
    }

    const updatedDependencies = [...task.dependencies, dependencyId];
    return this.updateTask(taskId, { dependencies: updatedDependencies });
  }

  async removeTaskDependency(taskId: string, dependencyId: string): Promise<Task> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task with ID "${taskId}" not found.`);
    }

    const initialLength = task.dependencies.length;
    const updatedDependencies = task.dependencies.filter(depId => depId !== dependencyId);

    if (updatedDependencies.length < initialLength) {
      // Dependency was found and removed
      return this.updateTask(taskId, { dependencies: updatedDependencies });
    } else {
      // Dependency not found, return the task as is
      return task;
    }
  }

  // --- Other Potential Methods (from high-level plan) ---

  // async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> { ... }
  // async validateProjectDependencies(): Promise<ValidationResult> { ... }
  // async getNextTasksToWorkOn(): Promise<Task[]> { ... }
}