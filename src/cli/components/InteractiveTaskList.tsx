import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';
import Table from './Ink/Table';
import { Task, TaskStatusSchema } from '@/types/task';
import { TaskManager } from '../../core/TaskManager';
import TaskDetail from './TaskDetail';
import StatusLabel from './StatusLabel';

interface InteractiveTaskListProps {
  taskManager: TaskManager;
}

const InteractiveTaskList: React.FC<InteractiveTaskListProps> = ({ taskManager }) => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const { exit } = useApp();

  // Fetch tasks on mount
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const fetchedTasks = await taskManager.getAllTasks();
        setTasks(fetchedTasks);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [taskManager]);

  // Format tasks for Table component
  const tableData = tasks.map((task) => {
    // Validate status
    const statusValue = TaskStatusSchema.safeParse(task.status);
    const statusText = statusValue.success
      ? statusValue.data
      : 'Invalid';

    return {
      ID: task.id,
      Title: task.title,
      Status: statusText,
      Priority: task.priority ?? 'N/A',
      Type: task.type ?? 'N/A',
      '#Deps': task.dependencies?.length ?? 0,
      '#Subtasks': task.subtasks?.length ?? 0,
    };
  });

  // Handle keyboard navigation
  const handleInput = useCallback((input: string, key: any) => {
    if (selectedTask) {
      // In detail view
      if (key.escape || input === 'q') {
        setSelectedTask(null); // Go back to list view
      }
    } else {
      // In list view
      if (key.escape || input === 'q') {
        exit(); // Exit app
      } else if (input === 'k' || key.upArrow) {
        // Move selection up
        setSelectedRowIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (input === 'j' || key.downArrow) {
        // Move selection down
        setSelectedRowIndex((prev) => (prev < tasks.length - 1 ? prev + 1 : prev));
      } else if (key.return) {
        // Select the current task
        const selected = tasks[selectedRowIndex];
        if (selected) {
          setSelectedTask(selected);
        }
      }
    }
  }, [selectedTask, tasks, selectedRowIndex, exit]);

  // Register keyboard input handler
  useInput(handleInput, { isActive: true });

  // No longer need separate Cell/SelectedCell components

  if (loading) {
    return (
      <Box>
        <Spinner type="dots" />
        <Text> Loading tasks...</Text>
      </Box>
    );
  }

  if (error) {
    return <Text color="red">Error: {error}</Text>;
  }

  if (selectedTask) {
    return (
      <Box flexDirection="column">
        <TaskDetail task={selectedTask} />
        <Text dimColor>(Press 'Esc' or 'q' to go back)</Text>
      </Box>
    );
  }

  // Create a modified tableData with highlighting for the selected row
  const enhancedTableData = tableData.map((row) => {
    // No need to modify the data, we'll handle highlighting in the cell renderer
    return row
  })

  return (
    <Box flexDirection="column">
      <Text bold>Interactive Task List (Press 'q' to quit)</Text>
      <Text dimColor>Use arrow keys (or j/k) to navigate, Enter to select a task</Text>
      {tasks.length === 0 ? (
        <Text>No tasks found.</Text>
      ) : (
        <Box paddingX={1}>
          <Table
            key={`table-${selectedRowIndex}`} // Force re-render on index change
            data={enhancedTableData}
            // selectedRowIndexProp removed
            cell={({ row, children }) => { // Use the 'row' prop passed by Table
              const isSelected = row === selectedRowIndex;
              return (
                <Text key={enhancedTableData[row as number].ID} color={isSelected ? 'blue' : undefined} bold={isSelected}>
                  {children}
                </Text>
              );
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default InteractiveTaskList;