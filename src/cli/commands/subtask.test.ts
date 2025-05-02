import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskManager } from '../../core/TaskManager';
import {
  updateSubtaskLogic,
  removeSubtaskLogic,
} from './subtask'; // Import the logic functions (will fail initially)
import {
  TaskStatusSchema,
  TaskStatus,
  Subtask,
  TaskNotFoundError,
  SubtaskNotFoundError,
} from '@/types/task';

// Mock TaskManager
vi.mock('../../core/TaskManager');

// Helper to create a mock subtask
const createMockSubtask = (id: string, data: Partial<Subtask> = {}): Subtask => ({
  id,
  title: `Subtask ${id}`,
  status: 'pending',
  ...data,
});

describe('updateSubtaskLogic', () => {
  let taskManager: TaskManager;
  let mockUpdateSubtask: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSubtask = vi.fn();
    taskManager = {
      updateSubtask: mockUpdateSubtask,
    } as unknown as TaskManager;
  });

  it('should call taskManager.updateSubtask with parsed options', async () => {
    const taskId = 'task-1';
    const subtaskId = 'sub-1.1';
    const options = {
      title: 'Updated Subtask Title',
      status: 'done',
    };
    const expectedUpdates = {
      title: 'Updated Subtask Title',
      status: TaskStatusSchema.parse('done'),
    };
    const mockReturnedSubtask = createMockSubtask(subtaskId, expectedUpdates);
    mockUpdateSubtask.mockResolvedValue(mockReturnedSubtask);

    const result = await updateSubtaskLogic(taskManager, taskId, subtaskId, options);

    expect(mockUpdateSubtask).toHaveBeenCalledTimes(1);
    expect(mockUpdateSubtask).toHaveBeenCalledWith(taskId, subtaskId, expectedUpdates);
    expect(result).toEqual(mockReturnedSubtask);
  });

  it('should throw an error if no update options are provided', async () => {
    const taskId = 'task-2';
    const subtaskId = 'sub-2.1';
    const options = {}; // Empty options

    await expect(
      updateSubtaskLogic(taskManager, taskId, subtaskId, options)
    ).rejects.toThrow('No updates provided. Use -t to set title or -s to set status.');
    expect(mockUpdateSubtask).not.toHaveBeenCalled();
  });

  it('should throw an error for invalid status', async () => {
    const taskId = 'task-3';
    const subtaskId = 'sub-3.1';
    const options = { status: 'invalid-status' };

    // Adjust the expectation to match the specific error string thrown by the logic
    await expect(
      updateSubtaskLogic(taskManager, taskId, subtaskId, options)
    ).rejects.toThrow(
      `Invalid status: ${options.status}. Must be one of: ${TaskStatusSchema.options.join(', ')}`
    );
    expect(mockUpdateSubtask).not.toHaveBeenCalled();
  });

  it('should re-throw TaskNotFoundError if taskManager throws it', async () => {
    const taskId = 'task-not-found';
    const subtaskId = 'sub-x.1';
    const options = { title: 'New Title' };
    const error = new TaskNotFoundError(taskId);
    mockUpdateSubtask.mockRejectedValue(error);

    await expect(
      updateSubtaskLogic(taskManager, taskId, subtaskId, options)
    ).rejects.toThrow(TaskNotFoundError);
    expect(mockUpdateSubtask).toHaveBeenCalledTimes(1);
  });

   it('should re-throw SubtaskNotFoundError if taskManager throws it', async () => {
    const taskId = 'task-4';
    const subtaskId = 'subtask-not-found';
    const options = { title: 'New Title' };
    const error = new SubtaskNotFoundError(taskId, subtaskId);
    mockUpdateSubtask.mockRejectedValue(error);

    await expect(
      updateSubtaskLogic(taskManager, taskId, subtaskId, options)
    ).rejects.toThrow(SubtaskNotFoundError);
    expect(mockUpdateSubtask).toHaveBeenCalledTimes(1);
  });

});

describe('removeSubtaskLogic', () => {
  let taskManager: TaskManager;
  let mockRemoveSubtask: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRemoveSubtask = vi.fn();
    taskManager = {
      removeSubtask: mockRemoveSubtask,
    } as unknown as TaskManager;
  });

  it('should call taskManager.removeSubtask and return true on success', async () => {
    const taskId = 'task-5';
    const subtaskId = 'sub-5.1';
    mockRemoveSubtask.mockResolvedValue(true); // Simulate successful removal

    const result = await removeSubtaskLogic(taskManager, taskId, subtaskId);

    expect(mockRemoveSubtask).toHaveBeenCalledTimes(1);
    expect(mockRemoveSubtask).toHaveBeenCalledWith(taskId, subtaskId);
    expect(result).toBe(true);
  });

  it('should call taskManager.removeSubtask and return false if not found', async () => {
    const taskId = 'task-6';
    const subtaskId = 'sub-6.non-existent';
    mockRemoveSubtask.mockResolvedValue(false); // Simulate subtask not found

    const result = await removeSubtaskLogic(taskManager, taskId, subtaskId);

    expect(mockRemoveSubtask).toHaveBeenCalledTimes(1);
    expect(mockRemoveSubtask).toHaveBeenCalledWith(taskId, subtaskId);
    expect(result).toBe(false);
  });

  it('should re-throw TaskNotFoundError if taskManager throws it', async () => {
    const taskId = 'task-not-found-for-remove';
    const subtaskId = 'sub-y.1';
    const error = new TaskNotFoundError(taskId);
    mockRemoveSubtask.mockRejectedValue(error);

    await expect(
      removeSubtaskLogic(taskManager, taskId, subtaskId)
    ).rejects.toThrow(TaskNotFoundError);
    expect(mockRemoveSubtask).toHaveBeenCalledTimes(1);
  });

   it('should throw an error if taskManager.removeSubtask throws an unexpected error', async () => {
    const taskId = 'task-7';
    const subtaskId = 'sub-7.1';
    const error = new Error('Storage write failed');
    mockRemoveSubtask.mockRejectedValue(error);

    await expect(
      removeSubtaskLogic(taskManager, taskId, subtaskId)
    ).rejects.toThrow('Storage write failed');
    expect(mockRemoveSubtask).toHaveBeenCalledTimes(1);
  });
});