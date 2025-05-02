import React from 'react';
import { Box, Text } from 'ink';
import Table from './Ink/Table'; 
import { Task, TaskStatusSchema } from '@/types/task';
import StatusLabel from './StatusLabel';
// import ProgressBar from 'ink-progress-bar'; // Import if adding progress bar later

interface TaskListProps {
  tasks: Task[];
  // highlightId?: string; // Add later if needed
}

const TaskList: React.FC<TaskListProps> = ({ tasks }) => {
  if (tasks.length === 0) {
    return <Text>No tasks found.</Text>;
  }

  const tableData = tasks.map((task) => {
    // Validate status and create StatusLabel component here
    const statusValue = TaskStatusSchema.safeParse(task.status);
    const statusText = statusValue.success
      ? statusValue.data // Assuming `statusValue.data` is a string or scalar
      : 'Invalid'; // Fallback for invalid status

    return {
      ID: task.id,
      Title: task.title,
      Status: statusText, // Use a scalar value for the data
      Priority: task.priority ?? 'N/A', // Handle optional priority
      Type: task.type ?? 'N/A', // Corrected property name
      '#Deps': task.dependencies?.length ?? 0,
      '#Subtasks': task.subtasks?.length ?? 0,
    // Progress: task.subtasks && task.subtasks.length > 0 // Add later if needed
    //   ? <ProgressBar percent={calculateProgress(task.subtasks)} />
    //   : 'N/A',
  }});

  // Helper function if progress bar is added
  // const calculateProgress = (subtasks: Subtask[]) => {
  //   const completed = subtasks.filter(s => s.status === 'done').length;
  //   return subtasks.length > 0 ? completed / subtasks.length : 0;
  // };

  return (
    <Box paddingX={1}>
      <Table data={tableData} />
    </Box>
  );
};

export default TaskList;
