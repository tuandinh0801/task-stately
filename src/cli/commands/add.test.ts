import { describe, it, expect, vi, beforeEach, MockInstance } from 'vitest'; // Import MockInstance
import { TaskManager } from '../../core/TaskManager';
import { addTaskLogic, AddTaskOptions } from './add'; // Import the logic function and options type
import { NewTaskData } from '@/core/storage/ITaskStorage'; // Correct import path
import {
  Task,
  TaskPriority,
  TaskType,
  TaskStatus, // Import TaskStatus
  TaskPrioritySchema, // Import Zod schemas
  TaskTypeSchema,
  TaskStatusSchema,
} from '../../types/task';

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


describe('addTaskLogic', () => {
  let taskManager: TaskManager;
  let mockCreateTask: MockInstance<(data: NewTaskData) => Promise<Task>>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a TaskManager instance and spy on its createTask method
    taskManager = new TaskManager({} as any); // We need an instance to pass
    mockCreateTask = vi.spyOn(taskManager, 'createTask'); // Spy on the method
  });

  it('should call taskManager.createTask with correct data and return the created task', async () => {
    const taskOptions: AddTaskOptions = {
      title: 'New Test Task',
      description: 'A description',
      priority: 'high', // Raw string input
      type: 'feature', // Raw string input
      tags: 'cli,test', // Comma-separated string as input
    };
    // Data expected to be passed to taskManager.createTask after logic processing
    const expectedCallData = {
        title: 'New Test Task',
        description: 'A description',
        priority: TaskPrioritySchema.enum.high, // Expect validated enum
        type: TaskTypeSchema.enum.feature,     // Expect validated enum
        status: TaskStatusSchema.enum.pending, // Expect default status
        tags: ['cli', 'test'],                 // Expect parsed array
        acceptanceCriteria: [],                // Expect default
        assignee: undefined,                   // Expect default
    };
    // Mock task returned by createTask (can simplify structure for mock)
    const mockReturnedTask = createMockTask('new-id', {
        ...expectedCallData, // Use the processed data for the mock return
    });
    mockCreateTask.mockResolvedValue(mockReturnedTask);

    const result = await addTaskLogic(taskManager, taskOptions);

    expect(mockCreateTask).toHaveBeenCalledTimes(1);
    // Verify the data passed to createTask matches the expected processed data
    expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining(expectedCallData));
    expect(result).toEqual(mockReturnedTask);
  });

  it('should call taskManager.createTask with minimal data (only title)', async () => {
    const taskOptions: AddTaskOptions = {
      title: 'Minimal Task',
    };
     // Data expected to be passed to taskManager.createTask after logic processing
     const expectedCallData = {
        title: 'Minimal Task',
        description: undefined,
        priority: TaskPrioritySchema.enum.medium, // Expect default priority
        type: TaskTypeSchema.enum.feature,      // Expect default type
        status: TaskStatusSchema.enum.pending,   // Expect default status
        tags: [],                                // Expect default
        acceptanceCriteria: [],                // Expect default
        assignee: undefined,                   // Expect default
    };
    // Mock task returned by createTask
    const mockReturnedTask = createMockTask('min-id', { title: 'Minimal Task' });
    mockCreateTask.mockResolvedValue(mockReturnedTask);

    const result = await addTaskLogic(taskManager, taskOptions);

    expect(mockCreateTask).toHaveBeenCalledTimes(1);
    // Verify the data passed to createTask matches the expected processed data with defaults
    expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining(expectedCallData));
    expect(result).toEqual(mockReturnedTask);
  });


  it('should throw an error if title is missing or empty', async () => {
    const invalidOptions: AddTaskOptions[] = [
        { title: '' },
        { title: '   ' },
        {} as AddTaskOptions // Cast to bypass TS check for the test case
    ];

    for (const options of invalidOptions) {
        await expect(addTaskLogic(taskManager, options))
          .rejects.toThrow('Task title cannot be empty.');
    }

    expect(mockCreateTask).not.toHaveBeenCalled();
  });


  it('should re-throw the error if taskManager.createTask throws', async () => {
    const taskOptions: AddTaskOptions = { title: 'Error Task' };
    const errorMessage = 'Failed to create task in storage';
    const mockError = new Error(errorMessage);
    mockCreateTask.mockRejectedValue(mockError);

    await expect(addTaskLogic(taskManager, taskOptions))
      .rejects.toThrow(errorMessage);

    expect(mockCreateTask).toHaveBeenCalledTimes(1);
    expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error Task' }));
  });

  it('should handle tags string with extra spaces', async () => {
    const taskOptions: AddTaskOptions = {
      title: 'Tags Test',
      tags: ' tag1 , tag2,tag3 ',
    };
    // Data expected to be passed to taskManager.createTask after logic processing
    const expectedCallData = {
        title: 'Tags Test',
        priority: TaskPrioritySchema.enum.medium, // Expect default
        type: TaskTypeSchema.enum.feature,      // Expect default
        status: TaskStatusSchema.enum.pending,   // Expect default
        tags: ['tag1', 'tag2', 'tag3'],          // Expect parsed and trimmed tags
        acceptanceCriteria: [],                // Expect default
        assignee: undefined,                   // Expect default
    };
    const mockReturnedTask = createMockTask('tags-id', { ...expectedCallData });
    mockCreateTask.mockResolvedValue(mockReturnedTask);

    await addTaskLogic(taskManager, taskOptions);

    expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining(expectedCallData));
  });

});