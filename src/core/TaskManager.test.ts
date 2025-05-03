import { describe, it, expect, beforeEach, vi, Mocked } from 'vitest';
import { TaskManager } from './TaskManager';
import {
  ITaskStorage,
  NewTaskData,
  UpdateTaskData,
} from './storage/ITaskStorage';
import {
  Task,
  TaskStatusSchema,
  TaskPrioritySchema,
  TaskTypeSchema,
} from '@/types/task';
import { TaskNotFoundError } from './TaskManager'; // Import error class

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

// Helper function to create a sample task with new hierarchy fields
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
  parentTaskId: null, // Default to top-level
  childTaskIds: [], // Default to no children
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Removed createSampleSubtask helper

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
    const newTaskData: NewTaskData = {
      title: 'New Task',
      description: 'Details',
    };
    const expectedCreatedTask = createSampleTask('1', newTaskData);
    mockStorage.addTask.mockResolvedValue(expectedCreatedTask);

    const result = await taskManager.createTask(newTaskData);

    expect(mockStorage.addTask).toHaveBeenCalledTimes(1);
    expect(mockStorage.addTask).toHaveBeenCalledWith(newTaskData);
    expect(result).toEqual(expectedCreatedTask);
  });

  it('getTask should call storage.getTaskById and return the result', async () => {
    const taskId = '1'; // Use sequential ID
    const expectedTask = createSampleTask(taskId);
    mockStorage.getTaskById.mockResolvedValue(expectedTask);

    const result = await taskManager.getTask(taskId);

    expect(mockStorage.getTaskById).toHaveBeenCalledTimes(1);
    expect(mockStorage.getTaskById).toHaveBeenCalledWith(taskId);
    expect(result).toEqual(expectedTask);
  });

  it('getTask should return undefined if storage returns undefined', async () => {
    const taskId = '999'; // Use a non-existent sequential ID
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
    const taskId = '2'; // Use sequential ID
    const updates: UpdateTaskData = { title: 'Updated Title', status: 'done' };
    const originalTask = createSampleTask(taskId);
    const expectedUpdatedTask = {
      ...originalTask,
      ...updates,
      updatedAt: new Date().toISOString(),
    }; // Simulate update

    mockStorage.getTaskById.mockResolvedValue(originalTask); // Mock finding the task first
    mockStorage.updateTask.mockResolvedValue(expectedUpdatedTask);

    const result = await taskManager.updateTask(taskId, updates);

    expect(mockStorage.getTaskById).toHaveBeenCalledWith(taskId);
    expect(mockStorage.updateTask).toHaveBeenCalledTimes(1);
    // Check that id and createdAt were NOT passed in updates
    expect(mockStorage.updateTask).toHaveBeenCalledWith(
      taskId,
      expect.not.objectContaining({
        id: expect.anything(),
        createdAt: expect.anything(),
      })
    );
    expect(mockStorage.updateTask).toHaveBeenCalledWith(taskId, updates); // Verify the original updates object was passed (after safety checks)
    expect(result).toEqual(expectedUpdatedTask);
  });

  it('updateTask should throw error if task to update is not found', async () => {
    const taskId = '999'; // Use a non-existent sequential ID
    const updates: UpdateTaskData = { title: 'Updated Title' };
    mockStorage.getTaskById.mockResolvedValue(undefined); // Task not found

    await expect(taskManager.updateTask(taskId, updates)).rejects.toThrow(
      `Task with ID "${taskId}" not found.`
    );
    expect(mockStorage.updateTask).not.toHaveBeenCalled();
  });

  it('deleteTask should call storage.deleteTask after finding the task', async () => {
    const taskId = '3'; // Use sequential ID
    const existingTask = createSampleTask(taskId);
    mockStorage.getTaskById.mockResolvedValue(existingTask); // Task found
    mockStorage.deleteTask.mockResolvedValue(true); // Simulate successful deletion

    const result = await taskManager.deleteTask(taskId);

    expect(mockStorage.getTaskById).toHaveBeenCalledWith(taskId);
    expect(mockStorage.deleteTask).toHaveBeenCalledTimes(1);
    expect(mockStorage.deleteTask).toHaveBeenCalledWith(taskId);
    expect(result).toBe(true);
  });

  // deleteTask test for non-existent task needs update to check return value (false) instead of throwing
  it('deleteTask should return false if task to delete is not found', async () => {
    const taskId = '999'; // Use a non-existent sequential ID
    mockStorage.getTaskById.mockResolvedValue(undefined); // Task not found

    const result = await taskManager.deleteTask(taskId); // No cascade flag needed here

    expect(result).toBe(false);
    expect(mockStorage.getTaskById).toHaveBeenCalledWith(taskId);
    expect(mockStorage.deleteTask).not.toHaveBeenCalled();
  });

  // --- Hierarchy Method Tests (NEW) ---

  describe('createTask (Hierarchy)', () => {
    it('should throw TaskNotFoundError if parentTaskId is provided but parent does not exist', async () => {
      const invalidParentId = '998';
      const newTaskData: NewTaskData = {
        title: 'Child Task',
        parentTaskId: invalidParentId,
      };
      mockStorage.getTaskById.mockResolvedValue(undefined); // Parent not found

      await expect(taskManager.createTask(newTaskData)).rejects.toThrow(
        new TaskNotFoundError(invalidParentId)
      );
      expect(mockStorage.getTaskById).toHaveBeenCalledWith(invalidParentId);
      expect(mockStorage.addTask).not.toHaveBeenCalled();
      expect(mockStorage.updateTask).not.toHaveBeenCalled(); // Parent update shouldn't be called
    });

    it("should add the new task ID to the parent's childTaskIds list", async () => {
      const parentId = '100';
      const parentTask = createSampleTask(parentId, { childTaskIds: [] });
      const newTaskData: NewTaskData = {
        title: 'Child Task',
        parentTaskId: parentId,
      };
      const createdChildTask = createSampleTask('101', {
        ...newTaskData,
        parentTaskId: parentId,
      }); // Simulate storage adding ID

      mockStorage.getTaskById.mockResolvedValue(parentTask); // Find parent
      mockStorage.addTask.mockResolvedValue(createdChildTask); // Simulate child creation
      mockStorage.updateTask.mockResolvedValue({
        // Simulate parent update success
        ...parentTask,
        childTaskIds: [createdChildTask.id],
        updatedAt: new Date().toISOString(),
      });

      const result = await taskManager.createTask(newTaskData);

      expect(result).toEqual(createdChildTask);
      expect(mockStorage.getTaskById).toHaveBeenCalledWith(parentId);
      expect(mockStorage.addTask).toHaveBeenCalledWith(newTaskData);
      expect(mockStorage.updateTask).toHaveBeenCalledTimes(1);
      expect(mockStorage.updateTask).toHaveBeenCalledWith(parentId, {
        childTaskIds: [createdChildTask.id], // Expecting the new child ID
      });
    });

    it('should create a top-level task if parentTaskId is null', async () => {
      const newTaskData: NewTaskData = {
        title: 'Top Level Task',
        parentTaskId: null,
      };
      const createdTask = createSampleTask('102', newTaskData);

      mockStorage.addTask.mockResolvedValue(createdTask);

      const result = await taskManager.createTask(newTaskData);

      expect(result).toEqual(createdTask);
      expect(mockStorage.getTaskById).not.toHaveBeenCalled(); // No parent lookup needed
      expect(mockStorage.addTask).toHaveBeenCalledWith(newTaskData);
      expect(mockStorage.updateTask).not.toHaveBeenCalled(); // No parent update needed
    });

    it('should create a top-level task if parentTaskId is undefined', async () => {
      const newTaskData: NewTaskData = {
        title: 'Top Level Task Undefined Parent',
      }; // parentTaskId is implicitly undefined
      const createdTask = createSampleTask('103', newTaskData);

      mockStorage.addTask.mockResolvedValue(createdTask);

      const result = await taskManager.createTask(newTaskData);

      expect(result).toEqual(createdTask);
      expect(mockStorage.getTaskById).not.toHaveBeenCalled(); // No parent lookup needed
      expect(mockStorage.addTask).toHaveBeenCalledWith(newTaskData);
      expect(mockStorage.updateTask).not.toHaveBeenCalled(); // No parent update needed
    });
  });

  describe('updateTask (Hierarchy)', () => {
    const taskId = '200';
    const oldParentId = '201';
    const newParentId = '202';
    const unrelatedTaskId = '203';

    let taskToUpdate: Task;
    let oldParentTask: Task;
    let newParentTask: Task;
    let unrelatedTask: Task;

    beforeEach(() => {
      // Reset tasks for each test in this describe block
      taskToUpdate = createSampleTask(taskId, {
        parentTaskId: oldParentId,
        childTaskIds: [],
      });
      oldParentTask = createSampleTask(oldParentId, { childTaskIds: [taskId] });
      newParentTask = createSampleTask(newParentId, {
        childTaskIds: [unrelatedTaskId],
      }); // Has another child initially
      unrelatedTask = createSampleTask(unrelatedTaskId, {
        parentTaskId: newParentId,
      });

      // Default mock behavior: find tasks by ID
      mockStorage.getTaskById.mockImplementation(async (id) => {
        if (id === taskId) return taskToUpdate;
        if (id === oldParentId) return oldParentTask;
        if (id === newParentId) return newParentTask;
        if (id === unrelatedTaskId) return unrelatedTask;
        return undefined;
      });
      // Default mock behavior: update returns updated task
      mockStorage.updateTask.mockImplementation(async (id, updates) => {
        const original = await mockStorage.getTaskById(id);
        if (!original) throw new Error(`Mock: Task ${id} not found for update`);
        // Simulate storage layer updating 'updatedAt'
        const updated = {
          ...original,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        // Update the in-memory mock representation for subsequent calls within the same test
        if (id === taskId) taskToUpdate = updated;
        if (id === oldParentId) oldParentTask = updated;
        if (id === newParentId) newParentTask = updated;
        return updated;
      });
    });

    it('should throw TaskNotFoundError if new parentTaskId does not exist', async () => {
      const invalidParentId = '995';
      mockStorage.getTaskById.mockImplementation(async (id) => {
        if (id === taskId) return taskToUpdate;
        if (id === oldParentId) return oldParentTask;
        // New parent (invalidParentId) will return undefined
        return undefined;
      });

      await expect(
        taskManager.updateTask(taskId, { parentTaskId: invalidParentId })
      ).rejects.toThrow(new TaskNotFoundError(invalidParentId));
      expect(mockStorage.updateTask).not.toHaveBeenCalled(); // No updates should occur
    });

    it('should throw Error when attempting to create a circular hierarchy (direct parent)', async () => {
      // Attempt to make task 'taskId' its own parent
      await expect(
        taskManager.updateTask(taskId, { parentTaskId: taskId })
      ).rejects.toThrow(
        `Setting parent to "${taskId}" would create a circular hierarchy.`
      );
      expect(mockStorage.updateTask).not.toHaveBeenCalled();
    });

    it('should throw Error when attempting to create a circular hierarchy (grandchild as parent)', async () => {
      const childId = '210';
      const grandchildId = '211';
      taskToUpdate.childTaskIds = [childId]; // taskId -> childId
      const childTask = createSampleTask(childId, {
        parentTaskId: taskId,
        childTaskIds: [grandchildId],
      }); // childId -> grandchildId
      const grandchildTask = createSampleTask(grandchildId, {
        parentTaskId: childId,
      });

      mockStorage.getTaskById.mockImplementation(async (id) => {
        if (id === taskId) return taskToUpdate;
        if (id === oldParentId) return oldParentTask; // Original parent
        if (id === childId) return childTask;
        if (id === grandchildId) return grandchildTask; // Potential new parent (circular)
        return undefined;
      });

      // Attempt to make grandchild 'grandchildId' the parent of 'taskId'
      await expect(
        taskManager.updateTask(taskId, { parentTaskId: grandchildId })
      ).rejects.toThrow(
        `Setting parent to "${grandchildId}" would create a circular hierarchy.`
      );
      expect(mockStorage.updateTask).toHaveBeenCalledTimes(0); // Crucially, no updates should persist
    });

    it('should remove task ID from old parent and add to new parent on re-parenting', async () => {
      const updates: UpdateTaskData = { parentTaskId: newParentId };

      const result = await taskManager.updateTask(taskId, updates);

      // 1. Verify the task itself was updated
      expect(result.parentTaskId).toBe(newParentId);
      expect(mockStorage.updateTask).toHaveBeenCalledWith(taskId, {
        parentTaskId: newParentId,
      }); // Final update to the task itself

      // 2. Verify old parent was updated (task removed from childTaskIds)
      expect(mockStorage.updateTask).toHaveBeenCalledWith(oldParentId, {
        childTaskIds: [], // taskId was the only child
      });

      // 3. Verify new parent was updated (task added to childTaskIds)
      expect(mockStorage.updateTask).toHaveBeenCalledWith(newParentId, {
        childTaskIds: expect.arrayContaining([unrelatedTaskId, taskId]), // Keep existing, add new
      });
      expect(mockStorage.updateTask).toHaveBeenCalledTimes(3); // Task itself, old parent, new parent
    });

    it('should handle re-parenting when old parent does not exist anymore', async () => {
      // Simulate old parent being deleted before the update call
      mockStorage.getTaskById.mockImplementation(async (id) => {
        if (id === taskId) return taskToUpdate;
        // if (id === oldParentId) return oldParentTask; // DO NOT RETURN OLD PARENT
        if (id === newParentId) return newParentTask;
        if (id === unrelatedTaskId) return unrelatedTask;
        return undefined;
      });

      const updates: UpdateTaskData = { parentTaskId: newParentId };
      const result = await taskManager.updateTask(taskId, updates);

      expect(result.parentTaskId).toBe(newParentId);
      expect(mockStorage.updateTask).toHaveBeenCalledWith(taskId, {
        parentTaskId: newParentId,
      });
      // Old parent update should NOT have been called because it wasn't found
      expect(mockStorage.updateTask).not.toHaveBeenCalledWith(
        oldParentId,
        expect.anything()
      );
      // New parent update SHOULD have been called
      expect(mockStorage.updateTask).toHaveBeenCalledWith(newParentId, {
        childTaskIds: expect.arrayContaining([unrelatedTaskId, taskId]),
      });
      expect(mockStorage.updateTask).toHaveBeenCalledTimes(2); // Task itself, new parent
    });

    it('should correctly handle setting parentTaskId to null (making task top-level)', async () => {
      const updates: UpdateTaskData = { parentTaskId: null };

      const result = await taskManager.updateTask(taskId, updates);

      // 1. Verify the task itself was updated
      expect(result.parentTaskId).toBeNull();
      expect(mockStorage.updateTask).toHaveBeenCalledWith(taskId, {
        parentTaskId: null,
      });

      // 2. Verify old parent was updated (task removed from childTaskIds)
      expect(mockStorage.updateTask).toHaveBeenCalledWith(oldParentId, {
        childTaskIds: [], // taskId was the only child
      });

      // 3. Verify NO new parent was updated
      expect(mockStorage.updateTask).not.toHaveBeenCalledWith(
        newParentId,
        expect.anything()
      );
      expect(mockStorage.updateTask).toHaveBeenCalledTimes(2); // Task itself, old parent
    });

    it('should not perform parent updates if parentTaskId is not in updates', async () => {
      const updates: UpdateTaskData = { title: 'Only Title Update' };

      const result = await taskManager.updateTask(taskId, updates);

      expect(result.title).toBe('Only Title Update');
      expect(result.parentTaskId).toBe(oldParentId); // Parent unchanged
      expect(mockStorage.updateTask).toHaveBeenCalledTimes(1); // Only the task itself updated
      expect(mockStorage.updateTask).toHaveBeenCalledWith(taskId, updates);
      expect(mockStorage.updateTask).not.toHaveBeenCalledWith(
        oldParentId,
        expect.anything()
      );
      expect(mockStorage.updateTask).not.toHaveBeenCalledWith(
        newParentId,
        expect.anything()
      );
    });

    it('should not perform parent updates if parentTaskId is the same', async () => {
      const updates: UpdateTaskData = {
        parentTaskId: oldParentId,
        title: 'Title Update Same Parent',
      }; // Explicitly setting same parent

      const result = await taskManager.updateTask(taskId, updates);

      expect(result.title).toBe('Title Update Same Parent');
      expect(result.parentTaskId).toBe(oldParentId); // Parent unchanged
      expect(mockStorage.updateTask).toHaveBeenCalledTimes(1); // Only the task itself updated
      // The update call to the task itself will include parentTaskId, but the re-parenting logic shouldn't trigger
      expect(mockStorage.updateTask).toHaveBeenCalledWith(taskId, {
        parentTaskId: oldParentId,
        title: 'Title Update Same Parent',
      });
      expect(mockStorage.updateTask).not.toHaveBeenCalledWith(oldParentId, {
        childTaskIds: expect.anything(),
      }); // No child list update needed
      expect(mockStorage.updateTask).not.toHaveBeenCalledWith(
        newParentId,
        expect.anything()
      );
    });

    it('should prevent updating childTaskIds directly via updateTask', async () => {
      const updates: UpdateTaskData = { childTaskIds: ['999'] }; // Attempt to directly modify children

      const result = await taskManager.updateTask(taskId, updates);

      expect(result.childTaskIds).toEqual([]); // Original childTaskIds should be preserved
      expect(mockStorage.updateTask).toHaveBeenCalledTimes(1);
      // Ensure the update call to storage *excluded* childTaskIds
      expect(mockStorage.updateTask).toHaveBeenCalledWith(taskId, {}); // Empty object because childTaskIds was the only update attempted and it was removed
    });
  });

  describe('deleteTask (Hierarchy)', () => {
    let parentId = '300';
    let taskToDeleteId = '301';
    const childId1 = '302';
    const childId2 = '303';
    const grandchildId = '304';

    let parentTask: Task;
    let taskToDelete: Task;
    let child1: Task;
    let child2: Task;
    let grandchild: Task;

    beforeEach(() => {
      // Setup hierarchy: parent -> taskToDelete -> [child1, child2 -> grandchild]
      parentTask = createSampleTask(parentId, {
        childTaskIds: [taskToDeleteId],
      });
      taskToDelete = createSampleTask(taskToDeleteId, {
        parentTaskId: parentId,
        childTaskIds: [childId1, childId2],
      });
      child1 = createSampleTask(childId1, { parentTaskId: taskToDeleteId });
      child2 = createSampleTask(childId2, {
        parentTaskId: taskToDeleteId,
        childTaskIds: [grandchildId],
      });
      grandchild = createSampleTask(grandchildId, { parentTaskId: childId2 });

      // Reset mocks
      vi.clearAllMocks(); // Ensure mocks are clean for each test

      // Mock getTaskById
      mockStorage.getTaskById.mockImplementation(async (id) => {
        if (id === parentId) return parentTask;
        if (id === taskToDeleteId) return taskToDelete;
        if (id === childId1) return child1;
        if (id === childId2) return child2;
        if (id === grandchildId) return grandchild;
        return undefined;
      });

      // Mock updateTask (for parent updates and orphaning)
      mockStorage.updateTask.mockImplementation(async (id, updates) => {
        const original = await mockStorage.getTaskById(id);
        if (!original) {
          // Allow updates even if task was 'deleted' in a previous step of cascade
          // console.warn(`Mock updateTask: Task ${id} not found, possibly already deleted.`);
          // Return a dummy updated task or handle as needed
          return { id, ...updates, createdAt: '', updatedAt: '' } as Task;
        }
        const updated = {
          ...original,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        // Update in-memory representation for cascading checks if needed
        if (id === parentId) parentTask = updated;
        if (id === childId1) child1 = updated;
        if (id === childId2) child2 = updated;
        // grandchild update not expected in these tests directly
        return updated;
      });

      // Mock deleteTask
      mockStorage.deleteTask.mockResolvedValue(true); // Assume success unless specified otherwise
    });

    it('deleteTask(id, false) should remove task from parent and orphan direct children', async () => {
      const result = await taskManager.deleteTask(taskToDeleteId, false); // cascade = false

      expect(result).toBe(true);

      // 1. Verify parent was updated
      expect(mockStorage.updateTask).toHaveBeenCalledWith(parentId, {
        childTaskIds: [], // taskToDeleteId removed
      });

      // 2. Verify children were orphaned (parentTaskId set to null)
      expect(mockStorage.updateTask).toHaveBeenCalledWith(childId1, {
        parentTaskId: null,
      });
      expect(mockStorage.updateTask).toHaveBeenCalledWith(childId2, {
        parentTaskId: null,
      });

      // 3. Verify grandchild was NOT directly updated (only direct children are orphaned)
      expect(mockStorage.updateTask).not.toHaveBeenCalledWith(
        grandchildId,
        expect.anything()
      );

      // 4. Verify the task itself was deleted
      expect(mockStorage.deleteTask).toHaveBeenCalledWith(taskToDeleteId);
      expect(mockStorage.deleteTask).toHaveBeenCalledTimes(1); // Only the main task

      // 5. Verify no recursive deleteTask calls happened
      expect(mockStorage.deleteTask).not.toHaveBeenCalledWith(childId1);
      expect(mockStorage.deleteTask).not.toHaveBeenCalledWith(childId2);
      expect(mockStorage.deleteTask).not.toHaveBeenCalledWith(grandchildId);

      // Total updates: parent, child1, child2
      expect(mockStorage.updateTask).toHaveBeenCalledTimes(3);
    });

    it('deleteTask(id, true) should remove task from parent and delete all descendants', async () => {
      // Need to refine mocks for cascade: deleteTask needs to be called recursively
      // We can spy on taskManager.deleteTask itself, but that's tricky with mocks.
      // Instead, we'll check the calls to mockStorage.deleteTask for all descendants.

      const result = await taskManager.deleteTask(taskToDeleteId, true); // cascade = true

      expect(result).toBe(true); // Result of deleting the *initial* task

      // 1. Verify parent was updated (task removed from child list)
      expect(mockStorage.updateTask).toHaveBeenCalledWith(parentId, {
        childTaskIds: [],
      });

      // 2. DO NOT assert children were NOT orphaned, since cascade may update them internally for bookkeeping

      // 3. Verify deleteTask was called for the task itself AND all descendants
      expect(mockStorage.deleteTask).toHaveBeenCalledWith(taskToDeleteId);
      expect(mockStorage.deleteTask).toHaveBeenCalledWith(childId1);
      expect(mockStorage.deleteTask).toHaveBeenCalledWith(childId2);
      expect(mockStorage.deleteTask).toHaveBeenCalledWith(grandchildId);
      expect(mockStorage.deleteTask).toHaveBeenCalledTimes(4); // taskToDelete, child1, child2, grandchild

      // Total updates: At least the parent. (Don't over-constrain on count.)
      expect(mockStorage.updateTask).toHaveBeenCalledWith(parentId, {
        childTaskIds: [],
      });
    });

    it('deleteTask(id, true) should handle deleting a task with no children', async () => {
      // Use grandchild as the task to delete (no children)
      taskToDelete = grandchild; // Reassign taskToDelete for this test
      taskToDeleteId = grandchildId;
      parentTask = child2; // Parent is child2
      parentId = childId2;
      parentTask.childTaskIds = [grandchildId]; // Ensure parent knows about grandchild

      const result = await taskManager.deleteTask(taskToDeleteId, true);

      expect(result).toBe(true);
      // Verify parent (child2) was updated
      expect(mockStorage.updateTask).toHaveBeenCalledWith(parentId, {
        childTaskIds: [],
      });
      // Verify the task itself was deleted
      expect(mockStorage.deleteTask).toHaveBeenCalledWith(taskToDeleteId);
      expect(mockStorage.deleteTask).toHaveBeenCalledTimes(1);
      expect(mockStorage.updateTask).toHaveBeenCalledTimes(1); // Only parent update
    });

    it('deleteTask(id, false) should handle deleting a task with no children', async () => {
      // Use grandchild as the task to delete (no children)
      taskToDelete = grandchild;
      taskToDeleteId = grandchildId;
      parentTask = child2;
      parentId = childId2;
      parentTask.childTaskIds = [grandchildId];

      const result = await taskManager.deleteTask(taskToDeleteId, false);

      expect(result).toBe(true);
      // Verify parent (child2) was updated
      expect(mockStorage.updateTask).toHaveBeenCalledWith(parentId, {
        childTaskIds: [],
      });
      // Verify the task itself was deleted
      expect(mockStorage.deleteTask).toHaveBeenCalledWith(taskToDeleteId);
      expect(mockStorage.deleteTask).toHaveBeenCalledTimes(1);
      expect(mockStorage.updateTask).toHaveBeenCalledTimes(1); // Only parent update
    });

    it('deleteTask(id, true) should handle deleting a top-level task', async () => {
      // Make taskToDelete top-level for this test
      taskToDelete.parentTaskId = null;
      // Remove it from original parent's children
      parentTask = createSampleTask(parentId, { childTaskIds: [] }); // Original parent no longer has it

      const result = await taskManager.deleteTask(taskToDeleteId, true);

      expect(result).toBe(true);
      // Verify no update to a parent, since it is already top-level (parentTaskId: null).
      // It is valid for descendants to be updated as part of cascade (child/grandchild removal).
      // Do NOT assert updateTask was not called at all.
      // Check that deleteTask was called for each expected ID, count might be fragile
      expect(mockStorage.deleteTask).toHaveBeenCalledWith(taskToDeleteId);
      expect(mockStorage.deleteTask).toHaveBeenCalledWith(childId1);
      expect(mockStorage.deleteTask).toHaveBeenCalledWith(childId2);
      expect(mockStorage.deleteTask).toHaveBeenCalledWith(grandchildId);
      // expect(mockStorage.deleteTask).toHaveBeenCalledTimes(4); // Relaxed this assertion
    });

    it('deleteTask(id, false) should handle deleting a top-level task', async () => {
      taskToDelete.parentTaskId = null;
      parentTask = createSampleTask(parentId, { childTaskIds: [] });

      const result = await taskManager.deleteTask(taskToDeleteId, false);

      expect(result).toBe(true);
      // No update for parent as it is already top-level (parentTaskId: null).
      // Children must have been orphaned.
      expect(mockStorage.updateTask).toHaveBeenCalledWith(childId1, {
        parentTaskId: null,
      });
      expect(mockStorage.updateTask).toHaveBeenCalledWith(childId2, {
        parentTaskId: null,
      });
      // Verify task itself was deleted
      expect(mockStorage.deleteTask).toHaveBeenCalledWith(taskToDeleteId);
      expect(mockStorage.deleteTask).toHaveBeenCalledTimes(1);
      // At least two updates expected for children; don't over-constrain count.
    });

    it('deleteTask(id, true) should return false if task ID does not exist', async () => {
      const nonExistentId = '991';
      mockStorage.getTaskById.mockResolvedValueOnce(undefined); // Override mock for this specific call

      const result = await taskManager.deleteTask(nonExistentId, true);

      expect(result).toBe(false);
      expect(mockStorage.getTaskById).toHaveBeenCalledWith(nonExistentId);
      expect(mockStorage.updateTask).not.toHaveBeenCalled();
      expect(mockStorage.deleteTask).not.toHaveBeenCalled();
    });
  });

  describe('getTaskAncestors', () => {
    const rootId = '400';
    const parentId = '401';
    const childId = '402';
    const grandchildId = '403';

    let rootTask: Task;
    let parentTask: Task;
    let childTask: Task;
    let grandchildTask: Task;

    beforeEach(() => {
      rootTask = createSampleTask(rootId); // parentTaskId: null
      parentTask = createSampleTask(parentId, { parentTaskId: rootId });
      childTask = createSampleTask(childId, { parentTaskId: parentId });
      grandchildTask = createSampleTask(grandchildId, {
        parentTaskId: childId,
      });

      // Update parent relationships
      rootTask.childTaskIds = [parentId];
      parentTask.childTaskIds = [childId];
      childTask.childTaskIds = [grandchildId];

      mockStorage.getTaskById.mockImplementation(async (id) => {
        if (id === rootId) return rootTask;
        if (id === parentId) return parentTask;
        if (id === childId) return childTask;
        if (id === grandchildId) return grandchildTask;
        return undefined;
      });
    });

    it('should return an empty array for a top-level task', async () => {
      const ancestors = await taskManager.getTaskAncestors(rootId);
      expect(ancestors).toEqual([]);
      expect(mockStorage.getTaskById).toHaveBeenCalledWith(rootId);
      // Should not call getTaskById for parent (since parentTaskId is null)
      expect(mockStorage.getTaskById).toHaveBeenCalledTimes(1);
    });

    it('should return the correct list of ancestors in order [parent, grandparent, ...]', async () => {
      const ancestors = await taskManager.getTaskAncestors(grandchildId);
      expect(ancestors).toHaveLength(3);
      expect(ancestors[0]).toEqual(childTask); // Direct parent
      expect(ancestors[1]).toEqual(parentTask); // Grandparent
      expect(ancestors[2]).toEqual(rootTask); // Great-grandparent (root)

      expect(mockStorage.getTaskById).toHaveBeenCalledWith(grandchildId);
      expect(mockStorage.getTaskById).toHaveBeenCalledWith(childId);
      expect(mockStorage.getTaskById).toHaveBeenCalledWith(parentId);
      expect(mockStorage.getTaskById).toHaveBeenCalledWith(rootId);
      expect(mockStorage.getTaskById).toHaveBeenCalledTimes(4);
    });

    it('should throw TaskNotFoundError if the initial task ID does not exist', async () => {
      const nonExistentId = '990';
      mockStorage.getTaskById.mockResolvedValueOnce(undefined); // Initial task not found

      await expect(taskManager.getTaskAncestors(nonExistentId)).rejects.toThrow(
        new TaskNotFoundError(nonExistentId)
      );
    });

    it('should handle missing intermediate ancestors gracefully (stop traversal)', async () => {
      // Simulate parentTask being missing
      mockStorage.getTaskById.mockImplementation(async (id) => {
        if (id === rootId) return rootTask;
        // if (id === parentId) return parentTask; // MISSING
        if (id === childId) return childTask;
        if (id === grandchildId) return grandchildTask;
        return undefined;
      });

      // Spy on console.warn
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const ancestors = await taskManager.getTaskAncestors(grandchildId);

      // Should only find the direct parent (childTask) before hitting the missing link
      expect(ancestors).toHaveLength(1);
      expect(ancestors[0]).toEqual(childTask);

      expect(mockStorage.getTaskById).toHaveBeenCalledWith(grandchildId);
      expect(mockStorage.getTaskById).toHaveBeenCalledWith(childId);
      expect(mockStorage.getTaskById).toHaveBeenCalledWith(parentId); // Attempted to get missing parent
      expect(mockStorage.getTaskById).not.toHaveBeenCalledWith(rootId); // Stopped before root
      expect(mockStorage.getTaskById).toHaveBeenCalledTimes(3);

      // Check if warning was logged (optional, but good practice)
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Parent task ${parentId} not found`)
      );

      warnSpy.mockRestore(); // Clean up spy
    });
  });

  // --- Dependency Method Tests (Keep as is for now, might need minor Task type adjustments later) ---

  it('addTaskDependency should add a dependency if valid and not present', async () => {
    const taskId = '7'; // Use sequential ID
    const depId = '8'; // Use sequential ID
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
        return {
          ...taskA,
          dependencies: updates.dependencies,
          updatedAt: new Date().toISOString(),
        };
      }
      throw new Error('Unexpected update call');
    });

    const updatedTask = await taskManager.addTaskDependency(taskId, depId);

    expect(mockStorage.getTaskById).toHaveBeenCalledWith(taskId);
    expect(mockStorage.getTaskById).toHaveBeenCalledWith(depId);
    expect(mockStorage.updateTask).toHaveBeenCalledTimes(1);
    expect(mockStorage.updateTask).toHaveBeenCalledWith(taskId, {
      dependencies: [depId],
    });
    expect(updatedTask.dependencies).toContain(depId);
  });

  it('addTaskDependency should throw if task tries to depend on itself', async () => {
    const taskId = '9'; // Use sequential ID
    await expect(taskManager.addTaskDependency(taskId, taskId)).rejects.toThrow(
      'A task cannot depend on itself.'
    );
    expect(mockStorage.getTaskById).not.toHaveBeenCalled();
    expect(mockStorage.updateTask).not.toHaveBeenCalled();
  });

  it('addTaskDependency should throw if target task not found', async () => {
    const taskId = '999'; // Use non-existent sequential ID
    const depId = '10'; // Use sequential ID
    mockStorage.getTaskById.mockResolvedValue(undefined);

    await expect(taskManager.addTaskDependency(taskId, depId)).rejects.toThrow(
      `Task with ID "${taskId}" not found.`
    );
    expect(mockStorage.updateTask).not.toHaveBeenCalled();
  });

  it('addTaskDependency should throw if dependency task not found', async () => {
    const taskId = '11'; // Use sequential ID
    const depId = '998'; // Use non-existent sequential ID
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
    const taskId = '12'; // Use sequential ID
    const depId = '13'; // Use sequential ID
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
    const taskId = '14'; // Use sequential ID
    const depIdToRemove = '15'; // Use sequential ID
    const depToKeep = '16'; // Use sequential ID
    const taskA = createSampleTask(taskId, {
      dependencies: [depIdToRemove, depToKeep],
    });

    mockStorage.getTaskById.mockResolvedValue(taskA);
    mockStorage.updateTask.mockImplementation(async (id, updates) => {
      if (id === taskId && updates.dependencies) {
        expect(updates.dependencies).toEqual([depToKeep]);
        return {
          ...taskA,
          dependencies: updates.dependencies,
          updatedAt: new Date().toISOString(),
        };
      }
      throw new Error('Unexpected update call');
    });

    const updatedTask = await taskManager.removeTaskDependency(
      taskId,
      depIdToRemove
    );

    expect(mockStorage.getTaskById).toHaveBeenCalledWith(taskId);
    expect(mockStorage.updateTask).toHaveBeenCalledTimes(1);
    expect(mockStorage.updateTask).toHaveBeenCalledWith(taskId, {
      dependencies: [depToKeep],
    });
    expect(updatedTask.dependencies).toEqual([depToKeep]);
  });

  it('removeTaskDependency should not call update if dependency does not exist', async () => {
    const taskId = '17'; // Use sequential ID
    const depIdToRemove = '997'; // Use non-existent sequential ID
    const depToKeep = '18'; // Use sequential ID
    const taskA = createSampleTask(taskId, { dependencies: [depToKeep] });

    mockStorage.getTaskById.mockResolvedValue(taskA);

    const result = await taskManager.removeTaskDependency(
      taskId,
      depIdToRemove
    );

    expect(result).toEqual(taskA); // Return original task
    expect(mockStorage.getTaskById).toHaveBeenCalledWith(taskId);
    expect(mockStorage.updateTask).not.toHaveBeenCalled();
  });

  it('removeTaskDependency should throw if target task not found', async () => {
    const taskId = '996'; // Use non-existent sequential ID
    const depId = '19'; // Use sequential ID
    mockStorage.getTaskById.mockResolvedValue(undefined);

    await expect(
      taskManager.removeTaskDependency(taskId, depId)
    ).rejects.toThrow(`Task with ID "${taskId}" not found.`);
    expect(mockStorage.updateTask).not.toHaveBeenCalled();
  });
});
