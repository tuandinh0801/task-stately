import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { TaskManager } from '../../core/TaskManager';
import { registerUpdateCommand } from './update'; // Assuming named export
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskType,
  UpdateTaskData,
  TaskNotFoundError,
  TaskStatusSchema,
  TaskPrioritySchema,
  TaskTypeSchema,
} from '../../types/task';
import { updateTaskLogic } from './update'; // Import the logic function

// Mock TaskManager
vi.mock('../../core/TaskManager');

// Helper to create a mock task
const createMockTask = (id: string, data: Partial<Task> = {}): Task => {
  const now = new Date().toISOString();
  return {
    id,
    title: `Task ${id}`,
    status: 'pending',
    description: '',
    createdAt: now,
    updatedAt: now,
    type: 'chore',
    priority: 'medium',
    dependencies: [],
    acceptanceCriteria: [],
    complexity: 1,
    subtasks: [],
    artifacts: [],
    tags: [],
    ...data,
  };
};

describe('updateTaskLogic', () => {
  let taskManager: TaskManager;
  let mockUpdateTask: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a fresh mock for each test
    mockUpdateTask = vi.fn();
    taskManager = {
      updateTask: mockUpdateTask,
    } as unknown as TaskManager; // Use unknown for stricter type checking if needed
  });

  it('should call taskManager.updateTask with parsed options', async () => {
    const taskId = 'task-123';
    const options = {
      title: 'New Title',
      description: 'New Desc',
      priority: 'high',
      type: 'feature',
      status: 'done',
      tags: ['tag1', 'tag2'],
      criteria: ['crit A', 'crit B'],
      assignee: 'user@example.com',
    };
    const expectedUpdateData: UpdateTaskData = {
      title: 'New Title',
      description: 'New Desc',
      priority: TaskPrioritySchema.parse('high'),
      type: TaskTypeSchema.parse('feature'),
      status: TaskStatusSchema.parse('done'),
      tags: ['tag1', 'tag2'],
      acceptanceCriteria: ['crit A', 'crit B'],
      assignee: 'user@example.com',
    };
    const mockReturnedTask = createMockTask(taskId, expectedUpdateData);
    mockUpdateTask.mockResolvedValue(mockReturnedTask);

    const result = await updateTaskLogic(taskManager, taskId, options);

    expect(mockUpdateTask).toHaveBeenCalledTimes(1);
    expect(mockUpdateTask).toHaveBeenCalledWith(taskId, expectedUpdateData);
    expect(result).toEqual(mockReturnedTask);
  });

  it('should call taskManager.updateTask with only specified options', async () => {
    const taskId = 'task-456';
    const options = {
      status: 'in-progress',
      // No other options
    };
    const expectedUpdateData: UpdateTaskData = {
      status: TaskStatusSchema.parse('in-progress'),
    };
    const mockReturnedTask = createMockTask(taskId, expectedUpdateData);
    mockUpdateTask.mockResolvedValue(mockReturnedTask);

    const result = await updateTaskLogic(taskManager, taskId, options);

    expect(mockUpdateTask).toHaveBeenCalledTimes(1);
    expect(mockUpdateTask).toHaveBeenCalledWith(taskId, expectedUpdateData);
    expect(result).toEqual(mockReturnedTask);
  });

  it('should throw an error if no update options are provided', async () => {
    const taskId = 'task-789';
    const options = {}; // Empty options

    await expect(updateTaskLogic(taskManager, taskId, options)).rejects.toThrow(
      'No update options provided.',
    );
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it('should throw an error for invalid priority', async () => {
    const taskId = 'task-abc';
    const options = { priority: 'invalid-priority' };

    await expect(updateTaskLogic(taskManager, taskId, options)).rejects.toThrow(
       // Zod error message might vary slightly, check for core part
      /Invalid enum value.*priority/
    );
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

   it('should throw an error for invalid status', async () => {
    const taskId = 'task-def';
    const options = { status: 'invalid-status' };

    await expect(updateTaskLogic(taskManager, taskId, options)).rejects.toThrow(
      /Invalid enum value.*status/
    );
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

   it('should throw an error for invalid type', async () => {
    const taskId = 'task-ghi';
    const options = { type: 'invalid-type' };

    await expect(updateTaskLogic(taskManager, taskId, options)).rejects.toThrow(
      /Invalid enum value.*type/
    );
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });


  it('should re-throw TaskNotFoundError if taskManager throws it', async () => {
    const taskId = 'non-existent-task';
    const options = { title: 'New Title' };
    const error = new TaskNotFoundError(taskId);
    mockUpdateTask.mockRejectedValue(error);

    await expect(updateTaskLogic(taskManager, taskId, options)).rejects.toThrow(
      TaskNotFoundError,
    );
    expect(mockUpdateTask).toHaveBeenCalledTimes(1);
    expect(mockUpdateTask).toHaveBeenCalledWith(taskId, { title: 'New Title' });
  });

  it('should throw a generic error if taskManager throws an unknown error', async () => {
    const taskId = 'task-jkl';
    const options = { title: 'Another Title' };
    const error = new Error('Something went wrong');
    mockUpdateTask.mockRejectedValue(error);

    await expect(updateTaskLogic(taskManager, taskId, options)).rejects.toThrow(
      'Something went wrong',
    );
    expect(mockUpdateTask).toHaveBeenCalledTimes(1);
    expect(mockUpdateTask).toHaveBeenCalledWith(taskId, { title: 'Another Title' });
  });
});

// Keep the old describe block for command registration tests if needed,
// or remove it if focusing solely on logic tests now.
// describe('registerUpdateCommand', () => { ... });