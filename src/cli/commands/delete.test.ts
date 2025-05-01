import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { TaskManager } from '../../core/TaskManager'; // Assuming TaskNotFoundError might be used
import { registerDeleteCommand } from './delete'; // Assuming named export
import { TaskNotFoundError } from '../../types/task';
import { deleteTaskLogic } from './delete'; // Import the logic function

// Mock TaskManager
vi.mock('../../core/TaskManager');


describe('deleteTaskLogic', () => {
  let taskManager: TaskManager;
  let mockDeleteTask: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a fresh mock for each test
    mockDeleteTask = vi.fn();
    taskManager = {
      deleteTask: mockDeleteTask,
    } as unknown as TaskManager;
  });

  it('should call taskManager.deleteTask with the ID and return true on success', async () => {
    const taskId = 'task-to-delete';
    mockDeleteTask.mockResolvedValue(true); // Simulate successful deletion

    const result = await deleteTaskLogic(taskManager, taskId);

    expect(mockDeleteTask).toHaveBeenCalledTimes(1);
    expect(mockDeleteTask).toHaveBeenCalledWith(taskId);
    expect(result).toBe(true);
  });

  it('should call taskManager.deleteTask and return false if task not found', async () => {
    const taskId = 'non-existent-task';
    mockDeleteTask.mockResolvedValue(false); // Simulate task not found

    const result = await deleteTaskLogic(taskManager, taskId);

    expect(mockDeleteTask).toHaveBeenCalledTimes(1);
    expect(mockDeleteTask).toHaveBeenCalledWith(taskId);
    expect(result).toBe(false);
  });

  it('should throw an error if taskManager.deleteTask throws', async () => {
    const taskId = 'task-with-error';
    const error = new Error('Database connection failed');
    mockDeleteTask.mockRejectedValue(error); // Simulate an unexpected error

    await expect(deleteTaskLogic(taskManager, taskId)).rejects.toThrow(
      'Database connection failed',
    );
    expect(mockDeleteTask).toHaveBeenCalledTimes(1);
    expect(mockDeleteTask).toHaveBeenCalledWith(taskId);
  });

   // Note: TaskNotFoundError is typically thrown by getTask, not deleteTask.
   // deleteTask usually returns boolean. If it were to throw TaskNotFoundError,
   // we could add a test like this:
   /*
   it('should re-throw TaskNotFoundError if taskManager throws it', async () => {
     const taskId = 'task-not-found-exception';
     const error = new TaskNotFoundError(taskId);
     mockDeleteTask.mockRejectedValue(error);

     await expect(deleteTaskLogic(taskManager, taskId)).rejects.toThrow(TaskNotFoundError);
     expect(mockDeleteTask).toHaveBeenCalledTimes(1);
     expect(mockDeleteTask).toHaveBeenCalledWith(taskId);
   });
   */

});

// Keep the old describe block for command registration tests if needed,
// or remove it if focusing solely on logic tests now.
// describe('registerDeleteCommand', () => { ... });