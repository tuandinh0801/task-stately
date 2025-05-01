import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { vol, fs } from 'memfs'; // Use vol for volume management, fs for mocked fs operations
import path from 'path';
import { JsonFileTaskStorage } from './JsonFileTaskStorage';
import { Task, TasksFile, TaskStatusSchema } from '@/types/task';
import { ITaskStorage, NewTaskData } from './ITaskStorage';

// Mock the actual fs module with memfs
vi.mock('fs/promises', async () => {
  const memfsModule = await vi.importActual<typeof import('memfs')>('memfs');
  return memfsModule.fs.promises; // Use the promises API from memfs
});

// Define the test file path within the virtual file system
const TEST_DIR = '/test-data';
const TEST_FILE_NAME = 'test-tasks.json';
const TEST_FILE_PATH = path.join(TEST_DIR, TEST_FILE_NAME);

// Helper to reset the volume before each test
beforeEach(() => {
  vol.reset();
  // Optionally create the base directory if needed, though initialize should handle it
  // vol.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
    // Optional: Any cleanup after tests if needed
});

describe('JsonFileTaskStorage', () => {
  let storage: ITaskStorage;

  beforeEach(() => {
    // Use the virtual path for the storage instance in each test
    storage = new JsonFileTaskStorage(TEST_FILE_PATH);
    // Reset initialization status if tracked internally (though ensureInitialized handles it)
  });

  describe('Initialization', () => {
    it('should create the directory and default file if they do not exist on initialize', async () => {
      expect(vol.existsSync(TEST_DIR)).toBe(false);
      await storage.initialize!(); // Use non-null assertion if initialize is optional
      expect(vol.existsSync(TEST_DIR)).toBe(true);
      expect(vol.existsSync(TEST_FILE_PATH)).toBe(true);

      const fileContent = vol.readFileSync(TEST_FILE_PATH, 'utf-8');
      const expectedDefault: TasksFile = { meta: { schemaVersion: 1, lastId: '0' }, tasks: [] };
      expect(JSON.parse(fileContent as string)).toEqual(expectedDefault);
    });

    it('should not throw if directory and file already exist on initialize', async () => {
      const initialData: TasksFile = { meta: { schemaVersion: 1, lastId: '1' }, tasks: [{ id: '1', title: 'Existing', status: 'pending', priority: 'medium', type: 'feature', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), dependencies: [], subtasks: [], acceptanceCriteria: [], artifacts: [], tags: [] }] };
      vol.mkdirSync(TEST_DIR, { recursive: true });
      vol.writeFileSync(TEST_FILE_PATH, JSON.stringify(initialData));

      await expect(storage.initialize!()).resolves.toBeUndefined();
      // Ensure file content wasn't overwritten
      const fileContent = vol.readFileSync(TEST_FILE_PATH, 'utf-8');
      expect(JSON.parse(fileContent as string)).toEqual(initialData);
    });

     it('should handle initialization errors gracefully (e.g., permissions)', async () => {
        // Mock fs.mkdir to throw an error
        const mkdirSpy = vi.spyOn(fs.promises, 'mkdir').mockRejectedValueOnce(new Error('Permission denied'));

        await expect(storage.initialize!()).rejects.toThrow(/Failed to initialize storage.*Permission denied/);
        mkdirSpy.mockRestore(); // Restore original function
    });
  });

  describe('loadTasks', () => {
    it('should return an empty array if the file is new or empty', async () => {
      await storage.initialize!(); // Ensure file exists
      const tasks = await storage.loadTasks();
      expect(tasks).toEqual([]);
    });

    it('should load tasks correctly from an existing file', async () => {
      const task1: Task = { id: '1', title: 'Task 1', status: 'pending', priority: 'medium', type: 'feature', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), dependencies: [], subtasks: [], acceptanceCriteria: [], artifacts: [], tags: [] };
      const task2: Task = { id: '2', title: 'Task 2', status: 'done', priority: 'high', type: 'bug', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), dependencies: [], subtasks: [], acceptanceCriteria: [], artifacts: [], tags: [] };
      const initialData: TasksFile = { meta: { schemaVersion: 1, lastId: '2' }, tasks: [task1, task2] };
      vol.mkdirSync(TEST_DIR, { recursive: true });
      vol.writeFileSync(TEST_FILE_PATH, JSON.stringify(initialData, null, 2));

      const tasks = await storage.loadTasks();
      expect(tasks).toHaveLength(2);
      expect(tasks).toEqual([task1, task2]); // Deep equality check
    });

    it('should throw an error if the file contains invalid JSON', async () => {
        vol.mkdirSync(TEST_DIR, { recursive: true });
        vol.writeFileSync(TEST_FILE_PATH, '{"meta": { "lastId": "0"}, "tasks": ['); // Invalid JSON

        await expect(storage.loadTasks()).rejects.toThrow(/Failed to parse JSON/);
    });

    it('should throw an error if the file content does not match the schema', async () => {
        const invalidData = { metadata: { last_id: 0 }, task_list: [] }; // Incorrect structure
        vol.mkdirSync(TEST_DIR, { recursive: true });
        vol.writeFileSync(TEST_FILE_PATH, JSON.stringify(invalidData));

        await expect(storage.loadTasks()).rejects.toThrow(/invalid or corrupted/);
    });
  });

  describe('addTask', () => {
    it('should add the first task correctly and update metadata', async () => {
      await storage.initialize!();
      const newTaskData: NewTaskData = { title: 'First Task', description: 'Do something' };
      const addedTask = await storage.addTask(newTaskData);

      expect(addedTask.id).toBe('1');
      expect(addedTask.title).toBe('First Task');
      expect(addedTask.status).toBe('pending'); // Default status
      expect(addedTask.createdAt).toBeDefined();
      expect(addedTask.updatedAt).toBe(addedTask.createdAt);

      const fileContent = JSON.parse(vol.readFileSync(TEST_FILE_PATH, 'utf-8') as string);
      expect(fileContent.meta.lastId).toBe('1');
      expect(fileContent.tasks).toHaveLength(1);
      expect(fileContent.tasks[0]).toEqual(addedTask); // Check if saved task matches returned task
    });

    it('should add subsequent tasks with incrementing IDs', async () => {
      await storage.initialize!();
      await storage.addTask({ title: 'Task 1' });
      const addedTask2 = await storage.addTask({ title: 'Task 2', status: 'in-progress' });

      expect(addedTask2.id).toBe('2');
      expect(addedTask2.title).toBe('Task 2');
      expect(addedTask2.status).toBe('in-progress');

      const fileContent = JSON.parse(vol.readFileSync(TEST_FILE_PATH, 'utf-8') as string);
      expect(fileContent.meta.lastId).toBe('2');
      expect(fileContent.tasks).toHaveLength(2);
      expect(fileContent.tasks[1].id).toBe('2');
    });

     it('should handle invalid lastId in metadata when getting next ID', async () => {
        const initialData: TasksFile = { meta: { schemaVersion: 1, lastId: 'invalid' }, tasks: [] };
        vol.mkdirSync(TEST_DIR, { recursive: true });
        vol.writeFileSync(TEST_FILE_PATH, JSON.stringify(initialData));

        const newTaskData: NewTaskData = { title: 'Test Task' };
        const addedTask = await storage.addTask(newTaskData);

        expect(addedTask.id).toBe('1'); // Should reset and start from 1

        const fileContent = JSON.parse(vol.readFileSync(TEST_FILE_PATH, 'utf-8') as string);
        expect(fileContent.meta.lastId).toBe('1'); // Metadata should be corrected
        expect(fileContent.tasks[0].id).toBe('1');
    });
  });

  describe('getTaskById', () => {
    beforeEach(async () => {
        // Pre-populate with some data
        await storage.initialize!();
        await storage.addTask({ title: 'Task One' }); // id: 1
        await storage.addTask({ title: 'Task Two' }); // id: 2
    });

    it('should return the correct task if ID exists', async () => {
      const task = await storage.getTaskById('1');
      expect(task).toBeDefined();
      expect(task!.id).toBe('1');
      expect(task!.title).toBe('Task One');
    });

    it('should return undefined if ID does not exist', async () => {
      const task = await storage.getTaskById('99');
      expect(task).toBeUndefined();
    });
  });

  describe('updateTask', () => {
     beforeEach(async () => {
        await storage.initialize!();
        await storage.addTask({ title: 'Initial Title' }); // id: 1
    });

    it('should update an existing task and the updatedAt timestamp', async () => {
      const updates = { title: 'Updated Title', status: TaskStatusSchema.Enum.done };
      const originalTask = await storage.getTaskById('1');
      const startTime = new Date(); // Time before update
      vi.useFakeTimers(); // Use fake timers to control Date()
      vi.setSystemTime(startTime);

      const updatedTask = await storage.updateTask('1', updates);

      expect(updatedTask.id).toBe('1');
      expect(updatedTask.title).toBe('Updated Title');
      expect(updatedTask.status).toBe('done');
      expect(updatedTask.createdAt).toBe(originalTask!.createdAt); // createdAt should not change
      expect(new Date(updatedTask.updatedAt).getTime()).toBe(startTime.getTime()); // updatedAt should be the time of update

      const fileContent = JSON.parse(vol.readFileSync(TEST_FILE_PATH, 'utf-8') as string);
      expect(fileContent.tasks[0].title).toBe('Updated Title');
      expect(fileContent.tasks[0].status).toBe('done');
      expect(fileContent.tasks[0].updatedAt).toBe(startTime.toISOString());

      vi.useRealTimers(); // Restore real timers
    });

    it('should throw an error if trying to update a non-existent task', async () => {
      await expect(storage.updateTask('99', { title: 'Ghost Task' })).rejects.toThrow(
        'Task with ID "99" not found.'
      );
    });

     it('should not allow updating id or createdAt fields (enforced by type)', async () => {
        // This test primarily verifies the type system, but we can try anyway
        const updates: any = { id: '100', createdAt: new Date().toISOString(), title: 'Attempt Update Immutable' };
        const updatedTask = await storage.updateTask('1', updates);

        expect(updatedTask.id).toBe('1'); // ID should remain '1'
        expect(updatedTask.createdAt).not.toBe(updates.createdAt); // createdAt should not change
        expect(updatedTask.title).toBe('Attempt Update Immutable'); // Title should update
    });
  });

  describe('deleteTask', () => {
     beforeEach(async () => {
        await storage.initialize!();
        await storage.addTask({ title: 'To Delete' }); // id: 1
        await storage.addTask({ title: 'To Keep' });   // id: 2
    });

    it('should delete an existing task and return true', async () => {
      const result = await storage.deleteTask('1');
      expect(result).toBe(true);

      const tasks = await storage.loadTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('2');

      const fileContent = JSON.parse(vol.readFileSync(TEST_FILE_PATH, 'utf-8') as string);
      expect(fileContent.tasks.find((t: Task) => t.id === '1')).toBeUndefined();
    });

    it('should return false if the task ID does not exist', async () => {
      const result = await storage.deleteTask('99');
      expect(result).toBe(false);

      const tasks = await storage.loadTasks();
      expect(tasks).toHaveLength(2); // No change
    });
  });

  describe('saveTasks', () => {
    it('should overwrite all existing tasks with the provided array', async () => {
        await storage.initialize!();
        await storage.addTask({ title: 'Old Task 1' });
        await storage.addTask({ title: 'Old Task 2' });

        const newTask1: Task = { id: '10', title: 'New Task 10', status: 'pending', priority: 'medium', type: 'chore', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), dependencies: [], subtasks: [], acceptanceCriteria: [], artifacts: [], tags: [] };
        const newTask2: Task = { id: '11', title: 'New Task 11', status: 'done', priority: 'low', type: 'docs', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), dependencies: [], subtasks: [], acceptanceCriteria: [], artifacts: [], tags: [] };
        const newTasks = [newTask1, newTask2];

        await storage.saveTasks(newTasks);

        const loadedTasks = await storage.loadTasks();
        expect(loadedTasks).toEqual(newTasks); // Should exactly match the saved array

        const fileContent = JSON.parse(vol.readFileSync(TEST_FILE_PATH, 'utf-8') as string);
        expect(fileContent.tasks).toEqual(newTasks);
        // Metadata should ideally remain unchanged unless saveTasks is designed to update it
        expect(fileContent.meta.lastId).toBe('2'); // Assuming saveTasks doesn't touch lastId
    });
  });

   describe('Error Handling', () => {
        it('should handle write errors during _writeDataFile', async () => {
            await storage.initialize!();
            const writeSpy = vi.spyOn(fs.promises, 'writeFile').mockRejectedValueOnce(new Error('Disk full'));
            const renameSpy = vi.spyOn(fs.promises, 'rename'); // To check if rename is called

            const taskData: NewTaskData = { title: 'Write Fail Test' };
            await expect(storage.addTask(taskData)).rejects.toThrow(/Could not write tasks file.*Disk full/);

            // Ensure rename wasn't called if writeFile failed
            expect(renameSpy).not.toHaveBeenCalled();

            writeSpy.mockRestore();
            renameSpy.mockRestore();
        });

         it('should handle rename errors during _writeDataFile (atomic write simulation)', async () => {
            await storage.initialize!();
            const writeSpy = vi.spyOn(fs.promises, 'writeFile').mockResolvedValueOnce(undefined); // Simulate successful write to temp
            const renameSpy = vi.spyOn(fs.promises, 'rename').mockRejectedValueOnce(new Error('Rename failed'));
            const unlinkSpy = vi.spyOn(fs.promises, 'unlink').mockResolvedValueOnce(undefined); // Mock cleanup

            const taskData: NewTaskData = { title: 'Rename Fail Test' };
            await expect(storage.addTask(taskData)).rejects.toThrow(/Could not write tasks file.*Rename failed/);

            // Ensure unlink was called to clean up temp file
            expect(unlinkSpy).toHaveBeenCalled();

            writeSpy.mockRestore();
            renameSpy.mockRestore();
            unlinkSpy.mockRestore();
        });
    });
});