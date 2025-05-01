import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input'; // Remove Item import
import { Task } from '../../types/task';
import { TaskManager } from '../../core/TaskManager'; // Correct: Use named import
import TaskDetail from './TaskDetail'; // To show details on selection
import StatusLabel from './StatusLabel'; // For display within SelectInput item

interface InteractiveTaskListProps {
  taskManager: TaskManager; // Pass instance to fetch tasks
}

// Define the structure for SelectInput items
interface TaskSelectItem {
  label: string; // Display text in the list
  value: string; // Task ID
  task: Task; // Full task object for details view
}

const InteractiveTaskList: React.FC<InteractiveTaskListProps> = ({ taskManager }) => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
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

  // Handle user input
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      if (selectedTask) {
        setSelectedTask(null); // Go back to list view from detail view
      } else {
        exit(); // Exit app from list view
      }
    }
    // Add more keybindings later (e.g., 'a' for add, '/' for filter)
  });

  // Handle task selection - Add explicit inline type for the item parameter
  const handleSelect = (item: { label: string; value: string }) => {
    // Find the full task object using the selected item's value (task ID)
    const selected = tasks.find(task => task.id === item.value);
    if (selected) {
      setSelectedTask(selected);
    }
    // Optionally handle case where task is not found, though it shouldn't happen here
  };

  // Format tasks for SelectInput
  const selectItems: TaskSelectItem[] = tasks.map((task) => ({
    label: `${task.id}: ${task.title} - `, // Basic label, StatusLabel added below
    value: task.id,
    task: task,
  }));

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

  return (
    <Box flexDirection="column">
      <Text bold>Interactive Task List (Press 'q' to quit)</Text>
      {tasks.length === 0 ? (
        <Text>No tasks found.</Text>
      ) : (
        <SelectInput
          items={selectItems}
          onSelect={handleSelect}
          // Custom component to render each item, including StatusLabel
          itemComponent={({ label, isSelected }) => (
            <Box>
              <Text color={isSelected ? 'blue' : undefined}>{label}</Text>
              {/* Find the task corresponding to the label to get status */}
              <StatusLabel status={tasks.find(t => t.id === label.split(':')[0])?.status ?? 'pending'} />
            </Box>
          )}
        />
      )}
    </Box>
  );
};

export default InteractiveTaskList;