import * as fs from 'fs/promises';
import * as path from 'path';
import { ITaskStorage, NewTaskData, UpdateTaskData } from './ITaskStorage';
import {
  Task,
  TasksFile,
  TasksFileSchema,
  TaskSchema, // Added
  TaskStatusSchema, // Added
  TaskPrioritySchema, // Added
  TaskTypeSchema, // Added
} from '../../types/task'; // Changed from alias to relative path

const DEFAULT_TASKS_FILE = 'tasks.json';
const DEFAULT_SCHEMA_VERSION = 2; // Updated schema version

export class JsonFileTaskStorage implements ITaskStorage {
  private readonly tasksFilePath: string;
  private isInitialized = false; // Track initialization status

  // Modified constructor to accept projectRoot
  constructor(projectRoot: string, fileName: string = DEFAULT_TASKS_FILE) {
    // Resolve the absolute path based on the provided projectRoot
    this.tasksFilePath = path.resolve(projectRoot, fileName);
    // Ensure the directory exists synchronously or handle async initialization elsewhere
    // fs.mkdirSync(path.dirname(this.tasksFilePath), { recursive: true }); // Consider async approach in initialize()
    console.log(
      `JsonFileTaskStorage initialized with path: ${this.tasksFilePath}`
    );
  }

  // --- Initialization ---

  async initialize(): Promise<void> {
    // Removed isInitialized check to ensure file existence check always runs
    // if (this.isInitialized) {
    //   return;
    // }
    try {
      // Ensure directory exists *before* attempting file operations
      const dirPath = path.dirname(this.tasksFilePath);
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`Storage directory ensured: ${dirPath}`); // Log after mkdir

      // Attempt to read the file to ensure it exists or create a default one if not
      await this._readDataFile();
      this.isInitialized = true; // Set only after successful read/create
    } catch (error) {
      console.error(`Error initializing JsonFileTaskStorage:`, error);
      // Decide if initialization failure should prevent further operations
      // For now, we'll let operations fail if the file can't be read/written later
      // but log the initialization error.
      this.isInitialized = false; // Mark as not successfully initialized
      // Re-throw or handle more gracefully depending on requirements
      throw new Error(
        `Failed to initialize storage at ${this.tasksFilePath}: ${error instanceof Error ? error.message : String(error)}`
      );
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

      // --- Data Migration & Validation ---
      // Handle potential old 'lastId' string and schema version
      let lastTaskId = 0;
      let schemaVersion = DEFAULT_SCHEMA_VERSION; // Assume current version initially

      if (jsonData.meta) {
        // Meta exists, check its contents
        schemaVersion = jsonData.meta.schemaVersion ?? DEFAULT_SCHEMA_VERSION; // Get existing or default

        // Handle old 'lastId' string migration
        if (typeof jsonData.meta.lastId === 'string') {
          const parsedOldId = parseInt(jsonData.meta.lastId, 10);
          lastTaskId = !isNaN(parsedOldId) ? parsedOldId : 0;
          delete jsonData.meta.lastId; // Remove old field
          jsonData.meta.lastTaskId = lastTaskId; // Add new field
          console.log(`Migrated lastId to lastTaskId: ${lastTaskId}`);
        } else if (typeof jsonData.meta.lastTaskId === 'number') {
          // Use existing lastTaskId if valid
          lastTaskId = jsonData.meta.lastTaskId;
        } else {
          // lastTaskId is missing or invalid in existing meta, default it
          lastTaskId = 0;
          jsonData.meta.lastTaskId = lastTaskId;
        }

        // Check schema version after handling potential migrations
        if (schemaVersion !== DEFAULT_SCHEMA_VERSION) {
          console.warn(
            `Schema version mismatch: File has ${schemaVersion}, expected ${DEFAULT_SCHEMA_VERSION}. Attempting to parse anyway.`
          );
          // Optional: Migrate data based on schemaVersion difference here
          // Optional: Update schemaVersion in meta if migration occurs
          // jsonData.meta.schemaVersion = DEFAULT_SCHEMA_VERSION; // Example: Force update after migration
        }
        // Ensure schemaVersion is correctly set in the object being parsed
        jsonData.meta.schemaVersion = schemaVersion;
      } else {
        // Meta itself is missing, create it with defaults
        console.log('Meta object missing, creating default.');
        jsonData.meta = {
          schemaVersion: DEFAULT_SCHEMA_VERSION,
          lastTaskId: 0,
        };
        // Update local variables just in case, though they should already be default
        lastTaskId = 0;
        schemaVersion = DEFAULT_SCHEMA_VERSION;
      }

      // Ensure the final object structure matches TasksFileSchema before parsing
      // (safeParse will handle validation based on the schema)

      // Validate the structure after potential migration/creation
      const parseResult = TasksFileSchema.safeParse(jsonData);
      if (!parseResult.success) {
        throw new Error(
          `Tasks file at ${this.tasksFilePath} is invalid or corrupted. Schema errors: ${parseResult.error.message}`
        );
      }
      return parseResult.data;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return default structure and write it back
        const defaultData: TasksFile = {
          meta: { schemaVersion: DEFAULT_SCHEMA_VERSION, lastTaskId: 0 }, // Use lastTaskId
          tasks: [],
        };
        // Write the default structure directly to the file path for initial creation
        try {
          const jsonData = JSON.stringify(defaultData, null, 2);
          await fs.writeFile(this.tasksFilePath, jsonData, 'utf-8');
          // Removed debugging console logs
        } catch (writeError) {
          console.error(`Error writing default file directly:`, writeError); // Keep error log
          // Re-throw the write error if it occurs during initial creation
          throw new Error(
            `Failed to create default tasks file: ${writeError instanceof Error ? writeError.message : String(writeError)}`
          );
        }
        return defaultData;
      } else if (error instanceof SyntaxError) {
        console.error(
          `Invalid JSON in tasks file at ${this.tasksFilePath}:`,
          error
        );
        throw new Error(
          `Failed to parse JSON from ${this.tasksFilePath}. File might be corrupted.`
        );
      } else {
        console.error(
          `Error reading tasks file at ${this.tasksFilePath}:`,
          error
        );
        throw new Error(
          `Could not read tasks file: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  private async _writeDataFile(data: TasksFile): Promise<void> {
    const tempFilePath = `${this.tasksFilePath}.${Date.now()}.tmp`;
    try {
      // Validate data before writing
      TasksFileSchema.parse(data); // Ensure data conforms to schema
      const jsonData = JSON.stringify(data, null, 2); // Pretty print JSON

      // Atomic write: write to temp file first
      await fs.writeFile(tempFilePath, jsonData, 'utf-8');

      // Rename temp file to actual file path
      await fs.rename(tempFilePath, this.tasksFilePath);
      // console.log(`Successfully wrote tasks to ${this.tasksFilePath}`); // Debug log
    } catch (error) {
      console.error(
        `Error writing tasks file to ${this.tasksFilePath}:`,
        error
      ); // Keep error log
      // Attempt to clean up the temporary file if it exists
      try {
        await fs.unlink(tempFilePath);
        // console.log(`Cleaned up temporary file: ${tempFilePath}`); // Debug log
      } catch (cleanupError) {
        // Log cleanup error but throw the original write/rename error
        console.error(
          `Error cleaning up temporary file ${tempFilePath}:`,
          cleanupError
        );
      }
      // Re-throw the original error that caused the failure
      throw new Error(
        `Could not write tasks file: ${error instanceof Error ? error.message : String(error)}`
      );
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
    return tasks.find((task) => task.id === id);
  }

  async getNextId(): Promise<string> {
    await this.ensureInitialized();
    const data = await this._readDataFile();
    // lastTaskId is guaranteed to be a non-negative integer by schema validation and migration
    const nextIdNumber = data.meta.lastTaskId + 1;
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
      type: taskData.type ?? TaskTypeSchema.Enum.task, // Align with schema default
      complexity: taskData.complexity, // Keep as potentially undefined if optional
      description: taskData.description, // Keep as potentially undefined if optional
      assignee: taskData.assignee, // Keep as potentially undefined if optional
      // Initialize arrays/objects if not part of NewTaskData
      parentTaskId: taskData.parentTaskId ?? null, // Handle parentTaskId, default to null
      childTaskIds: [], // Initialize childTaskIds as empty array
      dependencies: [], // Initialize dependencies as empty array
      acceptanceCriteria: taskData.acceptanceCriteria ?? [],
      artifacts: taskData.artifacts ?? [],
      tags: taskData.tags ?? [],
      // subtasks: [], // Removed - replaced by childTaskIds
      createdAt: now,
      updatedAt: now,
    };

    // TaskSchema.parse(newTask); // Temporarily remove explicit parse to isolate error

    const updatedTasks = [...currentData.tasks, newTask];
    // Update lastTaskId with the numeric value of the new ID
    const updatedMeta = {
      ...currentData.meta,
      lastTaskId: parseInt(nextId, 10),
    };

    await this._writeDataFile({ meta: updatedMeta, tasks: updatedTasks });
    return newTask;
  }

  async updateTask(id: string, updates: UpdateTaskData): Promise<Task> {
    await this.ensureInitialized();
    const currentData = await this._readDataFile();
    const taskIndex = currentData.tasks.findIndex((task) => task.id === id);

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
    const updatedTasks = currentData.tasks.filter((task) => task.id !== id);

    if (updatedTasks.length < initialLength) {
      // A task was removed
      await this._writeDataFile({
        meta: currentData.meta,
        tasks: updatedTasks,
      });
      return true;
    } else {
      // No task found with that ID, nothing changed
      return false;
    }
  }
}
