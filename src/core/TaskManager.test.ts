import { describe, it, expect, beforeEach, vi, Mocked } from 'vitest';
import { TaskManager } from './TaskManager';
import { ITaskStorage, NewTaskData, UpdateTaskData, NewSubtaskData, UpdateSubtaskData } from './storage/ITaskStorage';
import { Task, Subtask, TaskStatusSchema, TaskPrioritySchema, TaskTypeSchema } from '@/types/task';
import { v4 as uuidv4 } from 'uuid'; // Import uuid if needed for testing subtask IDs

// Mock the storage interface
const mockStorage: Mocked<ITaskStorage> = {
  initialize: vi.fn(),
  loadTasks: vi.fn(),
  saveTasks: vi.fn(),
  getTaskById: vi.fn(),
  addTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  getNextId: vi.fn(), // Although TaskManager doesn't call this directly
  dispose: vi.fn(),
};

// Helper function to create a sample task
const createSampleTask = (id: string, overrides: Partial<Task> = {}): Task => ({
  id,
  title: `Task ${id}`,
  description: `Description for task ${id}`,
  status: TaskStatusSchema.Enum.pending,
  priority: TaskPrioritySchema.Enum.medium,
  type: TaskTypeSchema.Enum.feature,
  complexity: 5,
  dependencies: [],
  acceptanceCriteria: [],
  artifacts: [],
  tags: [],
  subtasks: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Helper function to create a sample subtask
const createSampleSubtask = (id: string, overrides: Partial<Subtask> = {}): Subtask => ({
    id,
    title: `Subtask ${id}`,
    status: TaskStatusSchema.Enum.pending,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
});


describe('TaskManager', () => {
  let taskManager: TaskManager;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // Create a new TaskManager instance with the mock storage
    taskManager = new TaskManager(mockStorage);
  });

  // --- Task CRUD Method Tests ---

  it('createTask should call storage.addTask with correct data', async () => {
    const newTaskData: NewTaskData = { title: 'New Task', description: 'Details' };
    const expectedCreatedTask = createSampleTask('1', newTaskData);
    mockStorage.addTask.mockResolvedValue(expectedCreatedTask);

    const result = await taskManager.createTask(newTaskData);

    expect(mockStorage.addTask).toHaveBeenCalledTimes(1);
    expect(mockStorage.addTask).toHaveBeenCalledWith(newTaskData);
    expect(result).toEqual(expectedCreatedTask);
  });

  it('getTask should call storage.getTaskById and return the result', async () => {
    const taskId = 'task-123';
    const expectedTask = createSampleTask(taskId);
    mockStorage.getTaskById.mockResolvedValue(expectedTask);

    const result = await taskManager.getTask(taskId);

    expect(mockStorage.getTaskById).toHaveBeenCalledTimes(1);
    expect(mockStorage.getTaskById).toHaveBeenCalledWith(taskId);
    expect(result).toEqual(expectedTask);
  });

   it('getTask should return undefined if storage returns undefined', async () => {
    const taskId = 'non-existent';
    mockStorage.getTaskById.mockResolvedValue(undefined);

    const result = await taskManager.getTask(taskId);

    expect(mockStorage.getTaskById).toHaveBeenCalledTimes(1);
    expect(mockStorage.getTaskById).toHaveBeenCalledWith(taskId);
    expect(result).toBeUndefined();
  });

  it('getAllTasks should call storage.loadTasks and return the result', async () => {
    const expectedTasks = [createSampleTask('1'), createSampleTask('2')];
    mockStorage.loadTasks.mockResolvedValue(expectedTasks);

    const result = await taskManager.getAllTasks();

    expect(mockStorage.loadTasks).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedTasks);
  });

  it('updateTask should call storage.updateTask after finding the task', async () => {
    const taskId = 'task-abc';
    const updates: UpdateTaskData = { title: 'Updated Title', status: 'done' };
    const originalTask = createSampleTask(taskId);
    const expectedUpdatedTask = { ...originalTask, ...updates, updatedAt: new Date().toISOString() }; // Simulate update

    mockStorage.getTaskById.mockResolvedValue(originalTask); // Mock finding the task first
    mockStorage.updateTask.mockResolvedValue(expectedUpdatedTask);

    const result = await taskManager.updateTask(taskId, updates);

    expect(mockStorage.getTaskById).toHaveBeenCalledWith(taskId);
    expect(mockStorage.updateTask).toHaveBeenCalledTimes(1);
    // Check that id and createdAt were NOT passed in updates
    expect(mockStorage.updateTask).toHaveBeenCalledWith(taskId, expect.not.objectContaining({ id: expect.anything(), createdAt: expect.anything() }));
    expect(mockStorage.updateTask).toHaveBeenCalledWith(taskId, updates); // Verify the original updates object was passed (after safety checks)
    expect(result).toEqual(expectedUpdatedTask);
  });

  it('updateTask should throw error if task to update is not found', async () => {
    const taskId = 'non-existent';
    const updates: UpdateTaskData = { title: 'Updated Title' };
    mockStorage.getTaskById.mockResolvedValue(undefined); // Task not found

    await expect(taskManager.updateTask(taskId, updates)).rejects.toThrow(
      `Task with ID "${taskId}" not found.`
    );
    expect(mockStorage.updateTask).not.toHaveBeenCalled();
  });

  it('deleteTask should call storage.deleteTask after finding the task', async () => {
    const taskId = 'task-xyz';
    const existingTask = createSampleTask(taskId);
    mockStorage.getTaskById.mockResolvedValue(existingTask); // Task found
    mockStorage.deleteTask.mockResolvedValue(true); // Simulate successful deletion

    const result = await taskManager.deleteTask(taskId);

    expect(mockStorage.getTaskById).toHaveBeenCalledWith(taskId);
    expect(mockStorage.deleteTask).toHaveBeenCalledTimes(1);
    expect(mockStorage.deleteTask).toHaveBeenCalledWith(taskId);
    expect(result).toBe(true);
  });

  it('deleteTask should throw error if task to delete is not found', async () => {
    const taskId = 'non-existent';
    mockStorage.getTaskById.mockResolvedValue(undefined); // Task not found

    await expect(taskManager.deleteTask(taskId)).rejects.toThrow(
      `Task with ID "${taskId}" not found.`
    );
    expect(mockStorage.deleteTask).not.toHaveBeenCalled();
  });

  // --- Subtask Method Tests ---

  it('addSubtask should add a subtask to the parent task', async () => {
    const parentId = 'parent-1';
    const parentTask = createSampleTask(parentId);
    const newSubData: NewSubtaskData = { title: 'New Subtask' };

    mockStorage.getTaskById.mockResolvedValue(parentTask);
    // Mock updateTask to simulate saving the parent with the new subtask
    mockStorage.updateTask.mockImplementation(async (id, updates) => {
        if (id === parentId && updates.subtasks && updates.subtasks.length === 1) {
            return { ...parentTask, subtasks: updates.subtasks, updatedAt: new Date().toISOString() };
        }
        throw new Error('Unexpected update call');
    });

    const addedSubtask = await taskManager.addSubtask(parentId, newSubData);

    expect(mockStorage.getTaskById).toHaveBeenCalledWith(parentId);
    expect(addedSubtask.title).toBe('New Subtask');
    expect(addedSubtask.id).toBeDefined(); // Check if UUID was generated
    expect(addedSubtask.status).toBe('pending');
    expect(mockStorage.updateTask).toHaveBeenCalledTimes(1);
    expect(mockStorage.updateTask).toHaveBeenCalledWith(parentId, {
        subtasks: expect.arrayContaining([expect.objectContaining({ id: addedSubtask.id, title: 'New Subtask' })])
    });
  });

   it('addSubtask should throw if parent task not found', async () => {
    const parentId = 'non-existent-parent';
    const newSubData: NewSubtaskData = { title: 'New Subtask' };
    mockStorage.getTaskById.mockResolvedValue(undefined);

    await expect(taskManager.addSubtask(parentId, newSubData)).rejects.toThrow(
        `Parent task with ID "${parentId}" not found.`
    );
    expect(mockStorage.updateTask).not.toHaveBeenCalled();
  });

  it('updateSubtask should update the correct subtask', async () => {
    const parentId = 'parent-2';
    const subId = 'sub-abc';
    const originalSubtask = createSampleSubtask(subId, { title: 'Original Sub' });
    const parentTask = createSampleTask(parentId, { subtasks: [originalSubtask] });
    const subUpdates: UpdateSubtaskData = { title: 'Updated Sub', status: 'done' };

    mockStorage.getTaskById.mockResolvedValue(parentTask);
    mockStorage.updateTask.mockImplementation(async (id, updates) => {
        if (id === parentId && updates.subtasks && updates.subtasks.length === 1) {
             const updatedSub = updates.subtasks[0];
             expect(updatedSub.id).toBe(subId);
             expect(updatedSub.title).toBe('Updated Sub');
             expect(updatedSub.status).toBe('done');
             return { ...parentTask, subtasks: updates.subtasks, updatedAt: new Date().toISOString() };
        }
        throw new Error('Unexpected update call');
    });

    const updatedSubtaskResult = await taskManager.updateSubtask(parentId, subId, subUpdates);

    expect(mockStorage.getTaskById).toHaveBeenCalledWith(parentId);
    expect(updatedSubtaskResult.id).toBe(subId);
    expect(updatedSubtaskResult.title).toBe('Updated Sub');
    expect(updatedSubtaskResult.status).toBe('done');
    expect(mockStorage.updateTask).toHaveBeenCalledTimes(1);
    expect(mockStorage.updateTask).toHaveBeenCalledWith(parentId, {
        subtasks: expect.arrayContaining([expect.objectContaining({ id: subId, title: 'Updated Sub', status: 'done' })])
    });
  });

   it('updateSubtask should throw if parent task not found', async () => {
        const parentId = 'non-existent-parent';
        const subId = 'sub-abc';
        const subUpdates: UpdateSubtaskData = { title: 'Updated Sub' };
        mockStorage.getTaskById.mockResolvedValue(undefined);

        await expect(taskManager.updateSubtask(parentId, subId, subUpdates)).rejects.toThrow(
            `Parent task with ID "${parentId}" not found.`
        );
        expect(mockStorage.updateTask).not.toHaveBeenCalled();
    });

    it('updateSubtask should throw if subtask not found', async () => {
        const parentId = 'parent-3';
        const subId = 'non-existent-sub';
        const parentTask = createSampleTask(parentId, { subtasks: [createSampleSubtask('existing-sub')] });
        const subUpdates: UpdateSubtaskData = { title: 'Updated Sub' };

        mockStorage.getTaskById.mockResolvedValue(parentTask);

        await expect(taskManager.updateSubtask(parentId, subId, subUpdates)).rejects.toThrow(
            `Subtask with ID "${subId}" not found in task "${parentId}".`
        );
        expect(mockStorage.updateTask).not.toHaveBeenCalled();
    });

  it('removeSubtask should remove the correct subtask', async () => {
    const parentId = 'parent-4';
    const subIdToRemove = 'sub-to-remove';
    const subToKeep = createSampleSubtask('sub-to-keep');
    const parentTask = createSampleTask(parentId, { subtasks: [createSampleSubtask(subIdToRemove), subToKeep] });

    mockStorage.getTaskById.mockResolvedValue(parentTask);
    mockStorage.updateTask.mockImplementation(async (id, updates) => {
        if (id === parentId && updates.subtasks) {
             expect(updates.subtasks).toHaveLength(1);
             expect(updates.subtasks[0].id).toBe('sub-to-keep');
             return { ...parentTask, subtasks: updates.subtasks, updatedAt: new Date().toISOString() };
        }
        throw new Error('Unexpected update call');
    });

    const result = await taskManager.removeSubtask(parentId, subIdToRemove);

    expect(result).toBe(true);
    expect(mockStorage.getTaskById).toHaveBeenCalledWith(parentId);
    expect(mockStorage.updateTask).toHaveBeenCalledTimes(1);
    expect(mockStorage.updateTask).toHaveBeenCalledWith(parentId, {
        subtasks: [expect.objectContaining({ id: 'sub-to-keep' })]
    });
  });

   it('removeSubtask should return false if subtask not found', async () => {
    const parentId = 'parent-5';
    const subIdToRemove = 'non-existent-sub';
    const subToKeep = createSampleSubtask('sub-to-keep');
    const parentTask = createSampleTask(parentId, { subtasks: [subToKeep] });

    mockStorage.getTaskById.mockResolvedValue(parentTask);

    const result = await taskManager.removeSubtask(parentId, subIdToRemove);

    expect(result).toBe(false);
    expect(mockStorage.getTaskById).toHaveBeenCalledWith(parentId);
    expect(mockStorage.updateTask).not.toHaveBeenCalled();
  });

  // --- Dependency Method Tests ---

  it('addTaskDependency should add a dependency if valid and not present', async () => {
    const taskId = 'task-a';
    const depId = 'task-b';
    const taskA = createSampleTask(taskId, { dependencies: [] });
    const taskB = createSampleTask(depId); // Dependency task

    mockStorage.getTaskById.mockImplementation(async (id) => {
        if (id === taskId) return taskA;
        if (id === depId) return taskB;
        return undefined;
    });
    mockStorage.updateTask.mockImplementation(async (id, updates) => {
        if (id === taskId && updates.dependencies) {
            expect(updates.dependencies).toEqual([depId]);
            return { ...taskA, dependencies: updates.dependencies, updatedAt: new Date().toISOString() };
        }
        throw new Error('Unexpected update call');
    });

    const updatedTask = await taskManager.addTaskDependency(taskId, depId);

    expect(mockStorage.getTaskById).toHaveBeenCalledWith(taskId);
    expect(mockStorage.getTaskById).toHaveBeenCalledWith(depId);
    expect(mockStorage.updateTask).toHaveBeenCalledTimes(1);
    expect(mockStorage.updateTask).toHaveBeenCalledWith(taskId, { dependencies: [depId] });
    expect(updatedTask.dependencies).toContain(depId);
  });

  it('addTaskDependency should throw if task tries to depend on itself', async () => {
    const taskId = 'task-a';
    await expect(taskManager.addTaskDependency(taskId, taskId)).rejects.toThrow(
        'A task cannot depend on itself.'
    );
    expect(mockStorage.getTaskById).not.toHaveBeenCalled();
    expect(mockStorage.updateTask).not.toHaveBeenCalled();
  });

  it('addTaskDependency should throw if target task not found', async () => {
    const taskId = 'non-existent';
    const depId = 'task-b';
    mockStorage.getTaskById.mockResolvedValue(undefined);

    await expect(taskManager.addTaskDependency(taskId, depId)).rejects.toThrow(
        `Task with ID "${taskId}" not found.`
    );
    expect(mockStorage.updateTask).not.toHaveBeenCalled();
  });

   it('addTaskDependency should throw if dependency task not found', async () => {
    const taskId = 'task-a';
    const depId = 'non-existent-dep';
    const taskA = createSampleTask(taskId);

    mockStorage.getTaskById.mockImplementation(async (id) => {
        if (id === taskId) return taskA;
        return undefined; // Dependency not found
    });

    await expect(taskManager.addTaskDependency(taskId, depId)).rejects.toThrow(
        `Dependency task with ID "${depId}" not found.`
    );
    expect(mockStorage.updateTask).not.toHaveBeenCalled();
  });

  it('addTaskDependency should not add dependency if it already exists', async () => {
    const taskId = 'task-a';
    const depId = 'task-b';
    const taskA = createSampleTask(taskId, { dependencies: [depId] }); // Dependency already exists
    const taskB = createSampleTask(depId);

    mockStorage.getTaskById.mockImplementation(async (id) => {
        if (id === taskId) return taskA;
        if (id === depId) return taskB;
        return undefined;
    });

    const result = await taskManager.addTaskDependency(taskId, depId);

    expect(result).toEqual(taskA); // Should return original task
    expect(mockStorage.updateTask).not.toHaveBeenCalled(); // No update needed
  });

  it('removeTaskDependency should remove an existing dependency', async () => {
    const taskId = 'task-a';
    const depIdToRemove = 'task-b';
    const depToKeep = 'task-c';
    const taskA = createSampleTask(taskId, { dependencies: [depIdToRemove, depToKeep] });

    mockStorage.getTaskById.mockResolvedValue(taskA);
    mockStorage.updateTask.mockImplementation(async (id, updates) => {
        if (id === taskId && updates.dependencies) {
            expect(updates.dependencies).toEqual([depToKeep]);
            return { ...taskA, dependencies: updates.dependencies, updatedAt: new Date().toISOString() };
        }
        throw new Error('Unexpected update call');
    });

    const updatedTask = await taskManager.removeTaskDependency(taskId, depIdToRemove);

    expect(mockStorage.getTaskById).toHaveBeenCalledWith(taskId);
    expect(mockStorage.updateTask).toHaveBeenCalledTimes(1);
    expect(mockStorage.updateTask).toHaveBeenCalledWith(taskId, { dependencies: [depToKeep] });
    expect(updatedTask.dependencies).toEqual([depToKeep]);
  });

  it('removeTaskDependency should not call update if dependency does not exist', async () => {
    const taskId = 'task-a';
    const depIdToRemove = 'non-existent-dep';
    const depToKeep = 'task-c';
    const taskA = createSampleTask(taskId, { dependencies: [depToKeep] });

    mockStorage.getTaskById.mockResolvedValue(taskA);

    const result = await taskManager.removeTaskDependency(taskId, depIdToRemove);

    expect(result).toEqual(taskA); // Return original task
    expect(mockStorage.getTaskById).toHaveBeenCalledWith(taskId);
    expect(mockStorage.updateTask).not.toHaveBeenCalled();
  });

   it('removeTaskDependency should throw if target task not found', async () => {
    const taskId = 'non-existent';
    const depId = 'task-b';
    mockStorage.getTaskById.mockResolvedValue(undefined);

    await expect(taskManager.removeTaskDependency(taskId, depId)).rejects.toThrow(
        `Task with ID "${taskId}" not found.`
    );
    expect(mockStorage.updateTask).not.toHaveBeenCalled();
  });

});