import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskManager } from '../../core/TaskManager';
import {
  addDependencyLogic,
  removeDependencyLogic,
} from './dependency'; // Import the logic functions (will fail initially)
import { TaskNotFoundError } from '../../types/task';

// Mock TaskManager
vi.mock('../../core/TaskManager');

describe('addDependencyLogic', () => {
  let taskManager: TaskManager;
  let mockAddTaskDependency: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAddTaskDependency = vi.fn();
    taskManager = {
      addTaskDependency: mockAddTaskDependency,
    } as unknown as TaskManager;
  });

  it('should call taskManager.addTaskDependency with correct IDs', async () => {
    const taskId = 'task-1';
    const dependencyId = 'task-dep';
    mockAddTaskDependency.mockResolvedValue(undefined); // Simulate success (void return)

    await addDependencyLogic(taskManager, taskId, dependencyId);

    expect(mockAddTaskDependency).toHaveBeenCalledTimes(1);
    expect(mockAddTaskDependency).toHaveBeenCalledWith(taskId, dependencyId);
  });

  it('should re-throw TaskNotFoundError if taskManager throws it', async () => {
    const taskId = 'task-not-found';
    const dependencyId = 'task-dep';
    const error = new TaskNotFoundError(taskId);
    mockAddTaskDependency.mockRejectedValue(error);

    await expect(
      addDependencyLogic(taskManager, taskId, dependencyId)
    ).rejects.toThrow(TaskNotFoundError);
    expect(mockAddTaskDependency).toHaveBeenCalledTimes(1);
  });

   it('should throw an error if taskManager throws an unexpected error', async () => {
    const taskId = 'task-err';
    const dependencyId = 'task-dep-err';
    const error = new Error('Storage error');
    mockAddTaskDependency.mockRejectedValue(error);

    await expect(
      addDependencyLogic(taskManager, taskId, dependencyId)
    ).rejects.toThrow('Storage error');
    expect(mockAddTaskDependency).toHaveBeenCalledTimes(1);
  });
});

describe('removeDependencyLogic', () => {
  let taskManager: TaskManager;
  let mockRemoveTaskDependency: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRemoveTaskDependency = vi.fn();
    taskManager = {
      removeTaskDependency: mockRemoveTaskDependency,
    } as unknown as TaskManager;
  });

  it('should call taskManager.removeTaskDependency with correct IDs', async () => {
    const taskId = 'task-2';
    const dependencyId = 'task-dep-to-remove';
    // Assuming removeTaskDependency returns boolean or throws
    mockRemoveTaskDependency.mockResolvedValue(undefined); // Simulate success (void return)

    await removeDependencyLogic(taskManager, taskId, dependencyId);

    expect(mockRemoveTaskDependency).toHaveBeenCalledTimes(1);
    expect(mockRemoveTaskDependency).toHaveBeenCalledWith(taskId, dependencyId);
    // No result check needed as it returns void on success
  });

   it('should throw TaskNotFoundError if taskManager throws it for non-existent task', async () => {
    const taskId = 'task-3';
    const dependencyId = 'non-existent-dep';
    const error = new TaskNotFoundError(taskId); // Simulate task not found
    mockRemoveTaskDependency.mockRejectedValue(error);

    await expect(
      removeDependencyLogic(taskManager, taskId, dependencyId)
    ).rejects.toThrow(TaskNotFoundError);

    expect(mockRemoveTaskDependency).toHaveBeenCalledTimes(1);
    expect(mockRemoveTaskDependency).toHaveBeenCalledWith(taskId, dependencyId);
  });

  // Add a test case if removeTaskDependency specifically throws for non-existent dependency
   it('should throw an error if taskManager throws for non-existent dependency', async () => {
    const taskId = 'task-4';
    const dependencyId = 'non-existent-dep-id';
    // Simulate removeTaskDependency throwing a generic error for missing dependency
    const error = new Error(`Dependency "${dependencyId}" not found on task "${taskId}".`);
    mockRemoveTaskDependency.mockRejectedValue(error);

     await expect(
      removeDependencyLogic(taskManager, taskId, dependencyId)
    ).rejects.toThrow(`Dependency "${dependencyId}" not found on task "${taskId}".`);

    expect(mockRemoveTaskDependency).toHaveBeenCalledTimes(1);
    expect(mockRemoveTaskDependency).toHaveBeenCalledWith(taskId, dependencyId);
  });


  it('should re-throw TaskNotFoundError if taskManager throws it (general case)', async () => {
    const taskId = 'task-not-found-remove';
    const dependencyId = 'task-dep';
    const error = new TaskNotFoundError(taskId);
    mockRemoveTaskDependency.mockRejectedValue(error);

    await expect(
      removeDependencyLogic(taskManager, taskId, dependencyId)
    ).rejects.toThrow(TaskNotFoundError);
    expect(mockRemoveTaskDependency).toHaveBeenCalledTimes(1);
  });

   it('should throw an error if taskManager throws an unexpected error', async () => {
    const taskId = 'task-err-remove';
    const dependencyId = 'task-dep-err-remove';
    const error = new Error('Connection failed');
    mockRemoveTaskDependency.mockRejectedValue(error);

    await expect(
      removeDependencyLogic(taskManager, taskId, dependencyId)
    ).rejects.toThrow('Connection failed');
    expect(mockRemoveTaskDependency).toHaveBeenCalledTimes(1);
  });
});