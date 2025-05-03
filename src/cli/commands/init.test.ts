import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskManager } from '../../core/TaskManager';
import { initLogic } from './init'; // Import the logic function

// Mock TaskManager
vi.mock('../../core/TaskManager');

describe('initLogic', () => {
  let taskManager: TaskManager;
  let mockGetAllTasks: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a fresh mock for each test
    mockGetAllTasks = vi.fn();
    taskManager = {
      getAllTasks: mockGetAllTasks,
    } as unknown as TaskManager;
  });

  it('should call taskManager.getAllTasks to trigger initialization', async () => {
    mockGetAllTasks.mockResolvedValue([]); // Simulate successful call returning empty tasks

    await initLogic(taskManager);

    expect(mockGetAllTasks).toHaveBeenCalledTimes(1);
  });

  it('should throw an error if taskManager.getAllTasks throws', async () => {
    const error = new Error('Failed to initialize storage');
    mockGetAllTasks.mockRejectedValue(error); // Simulate an error during initialization

    await expect(initLogic(taskManager)).rejects.toThrow(
      'Failed to initialize storage'
    );
    expect(mockGetAllTasks).toHaveBeenCalledTimes(1);
  });
});

// Keep the old describe block for command registration tests if needed,
// or remove it if focusing solely on logic tests now.
// describe('registerInitCommand', () => { ... });
