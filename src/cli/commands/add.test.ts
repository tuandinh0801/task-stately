import { describe, it, expect, vi, beforeEach, MockInstance, Mocked } from 'vitest'; // Import MockInstance and Mocked
import { Command } from 'commander';
import inquirer from 'inquirer';
import { TaskManager } from '../../core/TaskManager';
import { addTaskLogic, AddTaskOptions, registerAddCommand } from './add'; // Import registerAddCommand
import { NewTaskData } from '@/core/storage/ITaskStorage'; // Correct import path
import {
  Task,
  TaskPriority,
  TaskType,
  TaskStatus, // Import TaskStatus
  TaskPrioritySchema, // Import Zod schemas
  TaskTypeSchema,
  TaskStatusSchema,
} from '@/types/task';

// Mock dependencies
vi.mock('../../core/TaskManager');
vi.mock('inquirer');

// Mock console
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);


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
    // subtasks: [], // Removed obsolete field
    parentTaskId: null, // Added new field
    childTaskIds: [], // Added new field
    artifacts: [],
    tags: [],
    ...data,
  };
};


describe('addTaskLogic', () => {
  let taskManager: Mocked<TaskManager>; // Use Mocked type
  let mockCreateTask: MockInstance<(data: NewTaskData) => Promise<Task>>;

  beforeEach(() => {
    vi.clearAllMocks(); // Clears mocks including inquirer and console

    // Create a mocked TaskManager instance
    taskManager = new TaskManager({} as any) as Mocked<TaskManager>;
    // Ensure methods are mock functions if not automatically mocked by vi.mock
    taskManager.createTask = vi.fn();
    mockCreateTask = taskManager.createTask; // Assign the mock function
  });

  // --- Tests for addTaskLogic (non-interactive part) ---

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

  it('should call taskManager.createTask with parentId if provided', async () => {
    const taskOptions: AddTaskOptions = {
      title: 'Child Task',
      parentId: 'parent-123', // Provide parentId
    };
    const expectedCallData = {
        title: 'Child Task',
        priority: TaskPrioritySchema.enum.medium, // Default
        type: TaskTypeSchema.enum.feature,      // Default
        status: TaskStatusSchema.enum.pending,   // Default
        tags: [],                                // Default
        acceptanceCriteria: [],                // Default
        assignee: undefined,                   // Default
        parentTaskId: 'parent-123',            // Expect parentId to be passed
    };
    const mockReturnedTask = createMockTask('child-id', { ...expectedCallData });
    mockCreateTask.mockResolvedValue(mockReturnedTask);

    await addTaskLogic(taskManager, taskOptions);

    expect(mockCreateTask).toHaveBeenCalledTimes(1);
    expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining(expectedCallData));
  });

});


// --- Tests for registerAddCommand and interactive flow ---
describe('registerAddCommand action handler (interactive)', () => {
  let program: Command;
  let taskManager: Mocked<TaskManager>;
  let mockAddTaskLogic: MockInstance<typeof addTaskLogic>;

  beforeEach(() => {
    vi.clearAllMocks(); // Clear mocks including inquirer and console

    program = new Command();
    // Mock TaskManager instance and its methods
    taskManager = new TaskManager({} as any) as Mocked<TaskManager>;
    taskManager.createTask = vi.fn(); // Mock the underlying method used by addTaskLogic

    // Mock the addTaskLogic function itself for testing the action handler's interaction
    // We need to mock the module where it's defined if we import it directly
    // For simplicity here, let's assume we can spy/mock it if it were structured differently,
    // or we test the side effects (like console logs and inquirer calls).
    // Let's focus on mocking inquirer and checking if createTask is called correctly via the logic.

    // Mock inquirer.prompt
    vi.mocked(inquirer.prompt).mockClear();

    registerAddCommand(program, taskManager);
  });

  it('should call inquirer.prompt and addTaskLogic when --interactive is used and confirmed', async () => {
    const mockAnswers = {
      title: 'Interactive Task',
      description: 'Interactive Desc',
      priority: TaskPrioritySchema.enum.high, // Use Zod enum value
      type: TaskTypeSchema.enum.bug,         // Use Zod enum value
      status: TaskStatusSchema.enum.pending,   // Use Zod enum value
      tags: 'tagA, tagB',
      criteria: 'crit1, crit2',
      assignee: 'tester',
      confirm: true,
    };
    vi.mocked(inquirer.prompt).mockResolvedValue(mockAnswers);

    const mockCreatedTask = createMockTask('interactive-1', { title: 'Interactive Task' });
    taskManager.createTask.mockResolvedValue(mockCreatedTask); // Mock the underlying storage call

    // Simulate running the command: node yourCli.js add --interactive
    await program.parseAsync(['node', 'test', 'add', '--interactive']);

    // Assertions
    expect(inquirer.prompt).toHaveBeenCalledTimes(1);
    // Check if prompt included expected questions (can be more specific)
    expect(inquirer.prompt).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'title' }),
        expect.objectContaining({ name: 'description' }),
        expect.objectContaining({ name: 'priority' }),
        expect.objectContaining({ name: 'type' }),
        expect.objectContaining({ name: 'status' }),
        expect.objectContaining({ name: 'tags' }),
        expect.objectContaining({ name: 'criteria' }),
        expect.objectContaining({ name: 'assignee' }),
        expect.objectContaining({ name: 'confirm' }),
      ])
    );

    // Check if the core logic (via taskManager.createTask) was called with processed data
    expect(taskManager.createTask).toHaveBeenCalledTimes(1);
    expect(taskManager.createTask).toHaveBeenCalledWith({
      title: 'Interactive Task',
      description: 'Interactive Desc',
      priority: TaskPrioritySchema.enum.high, // Use Zod enum value
      type: TaskTypeSchema.enum.bug,         // Use Zod enum value
      status: TaskStatusSchema.enum.pending,   // Use Zod enum value
      tags: ['tagA', 'tagB'], // Expect parsed array
      acceptanceCriteria: ['crit1', 'crit2'], // Expect parsed array
      assignee: 'tester',
    });

    // Check for success message
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('created successfully'));
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('created successfully'));
    expect(mockConsoleError).not.toHaveBeenCalled();
  });

  it('should not call addTaskLogic and log cancellation message if user does not confirm', async () => {
    const mockAnswers = {
      title: 'Cancelled Task',
      // ... other answers ...
      confirm: false, // User cancels
    };
    vi.mocked(inquirer.prompt).mockResolvedValue(mockAnswers);

    // Simulate running the command
    await program.parseAsync(['node', 'test', 'add', '--interactive']);

    // Assertions
    expect(inquirer.prompt).toHaveBeenCalledTimes(1);
    expect(taskManager.createTask).not.toHaveBeenCalled(); // Core logic should not be called
    expect(mockConsoleLog).toHaveBeenCalledWith('Task creation cancelled.');
    expect(mockConsoleError).not.toHaveBeenCalled();
  });

  it('should log an error if inquirer.prompt rejects', async () => {
    const inquirerError = new Error('Inquirer failed');
    vi.mocked(inquirer.prompt).mockRejectedValue(inquirerError);

    // Simulate running the command
    await program.parseAsync(['node', 'test', 'add', '--interactive']);

    // Assertions
    expect(inquirer.prompt).toHaveBeenCalledTimes(1);
    expect(taskManager.createTask).not.toHaveBeenCalled();
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Error adding task: Inquirer failed'));
    expect(mockConsoleLog).not.toHaveBeenCalledWith(expect.stringContaining('created successfully'));
    // Check if exit code was set (optional, depends on exact implementation)
    // expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  it('should log an error if addTaskLogic (taskManager.createTask) rejects in interactive mode', async () => {
    const mockAnswers = {
      title: 'Logic Error Task',
      description: '',
      priority: TaskPrioritySchema.enum.medium,
      type: TaskTypeSchema.enum.chore,
      status: TaskStatusSchema.enum.pending,
      tags: '',
      criteria: '',
      assignee: '',
      confirm: true, // User confirms
    };
    vi.mocked(inquirer.prompt).mockResolvedValue(mockAnswers);

    const logicError = new Error('Failed to save task to storage');
    taskManager.createTask.mockRejectedValue(logicError); // Mock the underlying storage call to fail

    // Simulate running the command
    await program.parseAsync(['node', 'test', 'add', '--interactive']);

    // Assertions
    expect(inquirer.prompt).toHaveBeenCalledTimes(1);
    expect(taskManager.createTask).toHaveBeenCalledTimes(1); // Logic was called
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Error adding task: Failed to save task to storage'));
    expect(mockConsoleLog).not.toHaveBeenCalledWith(expect.stringContaining('created successfully'));
  });

});