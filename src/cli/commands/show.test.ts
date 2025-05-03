import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskManager } from '../../core/TaskManager';
import { getShowTaskLogic, getChildTasksLogic } from './show';
import { Task } from '@/types/task';

// Mock TaskManager
vi.mock('../../core/TaskManager');

// Helper to create a mock task (updated for hierarchy)
const createMockTask = (id: string, data: Partial<Task> = {}): Task => {
  const now = new Date().toISOString();
  return {
    id,
    title: `Task ${id}`,
    status: 'pending',
    description: `Description for task ${id}`,
    createdAt: now,
    updatedAt: now,
    type: 'chore',
    priority: 'medium',
    dependencies: [],
    acceptanceCriteria: [],
    complexity: 1,
    parentTaskId: null, // Added
    childTaskIds: [], // Added
    // subtasks: [], // Removed
    artifacts: [],
    tags: [],
    ...data, // Apply overrides
  };
};


describe('getShowTaskLogic', () => {
  let taskManager: TaskManager;
  let mockGetTask: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock TaskManager instance for each test
    taskManager = new TaskManager({} as any); // Use 'as any' for mock storage
    mockGetTask = vi.fn();
    taskManager.getTask = mockGetTask;

    // Ensure the mock constructor returns our specific instance if needed elsewhere,
    // though direct calls to the logic function bypass the constructor need here.
    vi.mocked(TaskManager).mockImplementation(() => taskManager);
  });

  it('should call taskManager.getTask with the provided ID and return the task', async () => {
    const taskId = 'task-123';
    const expectedTask = createMockTask(taskId, {
      parentTaskId: 'parent-0',
      childTaskIds: ['child-1', 'child-2'],
    }); // Add hierarchy data
    mockGetTask.mockResolvedValue(expectedTask);

    const result = await getShowTaskLogic(taskManager, taskId);

    expect(mockGetTask).toHaveBeenCalledTimes(1);
    expect(mockGetTask).toHaveBeenCalledWith(taskId);
    expect(result).toEqual(expectedTask);
    // Add assertions for hierarchy fields
    expect(result?.parentTaskId).toBe('parent-0');
    expect(result?.childTaskIds).toEqual(['child-1', 'child-2']);
  });

  it('should throw an error if the task is not found', async () => {
    const taskId = 'not-found-id';
    mockGetTask.mockResolvedValue(undefined); // Task not found

    await expect(getShowTaskLogic(taskManager, taskId)).rejects.toThrow(
      `Task with ID "${taskId}" not found.`
    );

    expect(mockGetTask).toHaveBeenCalledTimes(1);
    expect(mockGetTask).toHaveBeenCalledWith(taskId);
  });

  it('should re-throw the error if taskManager.getTask throws', async () => {
    const taskId = 'error-id';
    const errorMessage = 'Database connection failed';
    const mockError = new Error(errorMessage);
    mockGetTask.mockRejectedValue(mockError);

    await expect(getShowTaskLogic(taskManager, taskId)).rejects.toThrow(
      errorMessage
    );

    expect(mockGetTask).toHaveBeenCalledTimes(1);
    expect(mockGetTask).toHaveBeenCalledWith(taskId);
  });

  it('should throw an error if taskId is empty or whitespace', async () => {
    await expect(getShowTaskLogic(taskManager, '')).rejects.toThrow(
      'Task ID cannot be empty.'
    );
    await expect(getShowTaskLogic(taskManager, '   ')).rejects.toThrow(
      'Task ID cannot be empty.'
    );
    expect(mockGetTask).not.toHaveBeenCalled();
  });
});
