import * as fs from 'fs/promises';
import * as path from 'path';
import {
  ITaskStorage,
  NewTaskData,
  UpdateTaskData,
} from './ITaskStorage';
import {
  Task,
  TasksFile,
  TasksFileSchema,
  TaskSchema, // Added
  TaskStatusSchema, // Added
  TaskPrioritySchema, // Added
  TaskTypeSchema // Added
} from '@/types/task';

const DEFAULT_TASKS_FILE = 'tasks.json';
const DEFAULT_SCHEMA_VERSION = 1;

export class JsonFileTaskStorage implements ITaskStorage {
  private readonly tasksFilePath: string;
  private isInitialized = false; // Track initialization status

  constructor(filePath: string = DEFAULT_TASKS_FILE) {
    // Resolve the absolute path based on the current working directory
    this.tasksFilePath = path.resolve(process.cwd(), filePath);
    console.log(`JsonFileTaskStorage initialized with path: ${this.tasksFilePath}`);
  }

  // --- Initialization ---

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    try {
      const dirPath = path.dirname(this.tasksFilePath);
      await fs.mkdir(dirPath, { recursive: true });
      // Attempt to read the file to ensure it exists or create a default one if not
      await this._readDataFile();
      this.isInitialized = true;
      console.log(`Storage directory ensured: ${dirPath}`);
    } catch (error) {
      console.error(`Error initializing JsonFileTaskStorage:`, error);
      // Decide if initialization failure should prevent further operations
      // For now, we'll let operations fail if the file can't be read/written later
      // but log the initialization error.
      this.isInitialized = false; // Mark as not successfully initialized
      // Re-throw or handle more gracefully depending on requirements
      throw new Error(`Failed to initialize storage at ${this.tasksFilePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async ensureInitialized(): Promise<void> {
      if (!this.isInitialized) {
          await this.initialize();
      }
  }

  // --- Private Helper Methods ---

  private async _readDataFile(): Promise<TasksFile> {
    try {
      const fileContent = await fs.readFile(this.tasksFilePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);

      // Validate the structure
      const parseResult = TasksFileSchema.safeParse(jsonData);
      if (!parseResult.success) {
        console.error('Invalid tasks file structure:', parseResult.error.errors);
        // Decide on recovery strategy: throw, return default, attempt migration?
        // For now, throw an error indicating corruption or incompatibility.
        throw new Error(`Tasks file at ${this.tasksFilePath} is invalid or corrupted. Schema errors: ${parseResult.error.message}`);
      }
      // console.log(`Successfully read and validated data from ${this.tasksFilePath}`);
      return parseResult.data;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log(`Tasks file not found at ${this.tasksFilePath}. Creating default structure.`);
        // File doesn't exist, return default structure and write it back
        const defaultData: TasksFile = {
          meta: { schemaVersion: DEFAULT_SCHEMA_VERSION, lastId: '0' },
          tasks: [],
        };
        // Write the default structure back to the file
        await this._writeDataFile(defaultData);
        return defaultData;
      } else if (error instanceof SyntaxError) {
          console.error(`Invalid JSON in tasks file at ${this.tasksFilePath}:`, error);
          throw new Error(`Failed to parse JSON from ${this.tasksFilePath}. File might be corrupted.`);
      } else {
        console.error(`Error reading tasks file at ${this.tasksFilePath}:`, error);
        throw new Error(`Could not read tasks file: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async _writeDataFile(data: TasksFile): Promise<void> {
    try {
      // Optional: Validate data before writing? TasksFileSchema.parse(data);
      const jsonData = JSON.stringify(data, null, 2); // Pretty print JSON
      // Consider atomic write: write to temp file, then rename
      const tempFilePath = `${this.tasksFilePath}.${Date.now()}.tmp`;
      await fs.writeFile(tempFilePath, jsonData, 'utf-8');
      await fs.rename(tempFilePath, this.tasksFilePath);
      // console.log(`Successfully wrote data to ${this.tasksFilePath}`);
    } catch (error) {
      console.error(`Error writing tasks file to ${this.tasksFilePath}:`, error);
      // Attempt to clean up temp file if rename failed
      try {
          const tempFilePath = `${this.tasksFilePath}.${Date.now()}.tmp`; // Reconstruct potential temp name - needs better handling
          await fs.unlink(tempFilePath).catch(() => {}); // Ignore errors during cleanup
      } catch {}
      throw new Error(`Could not write tasks file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // --- ITaskStorage Implementation ---

  async loadTasks(): Promise<Task[]> {
    await this.ensureInitialized();
    const data = await this._readDataFile();
    return data.tasks;
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    await this.ensureInitialized();
    const currentData = await this._readDataFile(); // Read to get current metadata
    const dataToSave: TasksFile = {
      meta: currentData.meta, // Keep existing metadata
      tasks: tasks, // Use the provided tasks array
    };
    await this._writeDataFile(dataToSave);
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    await this.ensureInitialized();
    const tasks = await this.loadTasks();
    return tasks.find(task => task.id === id);
  }

  async getNextId(): Promise<string> {
    await this.ensureInitialized();
    const data = await this._readDataFile();
    const lastIdNumber = parseInt(data.meta.lastId, 10);
    if (isNaN(lastIdNumber)) {
        console.error(`Invalid lastId found in metadata: ${data.meta.lastId}. Resetting to 0.`);
        // Potentially save the corrected metadata here or handle it in addTask
        return '1'; // Start from 1 if lastId was invalid
    }
    const nextIdNumber = lastIdNumber + 1;
    return nextIdNumber.toString();
  }

  async addTask(taskData: NewTaskData): Promise<Task> {
    await this.ensureInitialized();
    const currentData = await this._readDataFile();
    const nextId = await this.getNextId(); // Get the next ID string

    const now = new Date().toISOString();
    const newTask: Task = {
      ...taskData, // Spread the input data
      id: nextId, // Assign the generated ID
      // Ensure required fields have defaults if not provided in taskData and TaskSchema
      status: taskData.status ?? TaskStatusSchema.Enum.pending,
      priority: taskData.priority ?? TaskPrioritySchema.Enum.medium,
      type: taskData.type ?? TaskTypeSchema.Enum.feature,
      complexity: taskData.complexity, // Keep as potentially undefined if optional
      description: taskData.description, // Keep as potentially undefined if optional
      assignee: taskData.assignee, // Keep as potentially undefined if optional
      // Initialize arrays/objects if not part of NewTaskData
      dependencies: [],
      acceptanceCriteria: taskData.acceptanceCriteria ?? [],
      artifacts: taskData.artifacts ?? [],
      tags: taskData.tags ?? [],
      subtasks: [], // Initialize subtasks as empty array
      createdAt: now,
      updatedAt: now,
    };

    // Validate the newly created task against the schema before saving
    // This catches issues if defaults or merging logic is incorrect
    TaskSchema.parse(newTask);

    const updatedTasks = [...currentData.tasks, newTask];
    const updatedMeta = { ...currentData.meta, lastId: nextId }; // Update lastId in metadata

    await this._writeDataFile({ meta: updatedMeta, tasks: updatedTasks });
    return newTask;
  }

  async updateTask(id: string, updates: UpdateTaskData): Promise<Task> {
    await this.ensureInitialized();
    const currentData = await this._readDataFile();
    const taskIndex = currentData.tasks.findIndex(task => task.id === id);

    if (taskIndex === -1) {
      throw new Error(`Task with ID "${id}" not found.`);
    }

    const originalTask = currentData.tasks[taskIndex];

    // Create the updated task object
    const updatedTask: Task = {
      ...originalTask, // Start with the original task
      ...updates, // Apply the updates
      id: originalTask.id, // Ensure ID is not changed
      createdAt: originalTask.createdAt, // Ensure createdAt is not changed
      updatedAt: new Date().toISOString(), // Set the new updated timestamp
    };
    
    // Validate the updated task object
    TaskSchema.parse(updatedTask);

    const updatedTasks = [...currentData.tasks]; // Create a new array
    updatedTasks[taskIndex] = updatedTask; // Replace the task at the index

    await this._writeDataFile({ meta: currentData.meta, tasks: updatedTasks });
    return updatedTask;
  }

  async deleteTask(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const currentData = await this._readDataFile();
    const initialLength = currentData.tasks.length;
    const updatedTasks = currentData.tasks.filter(task => task.id !== id);

    if (updatedTasks.length < initialLength) {
      // A task was removed
      await this._writeDataFile({ meta: currentData.meta, tasks: updatedTasks });
      return true;
    } else {
      // No task found with that ID, nothing changed
      return false;
    }
  }
}