import React from 'react';
import { Box, Text, Spacer } from 'ink';
import Divider from 'ink-divider';
import ProgressBar from './Ink/ProgressBar';
import { Task, Subtask } from '@/types/task';
import StatusLabel from './StatusLabel';
import Markdown from './Ink/Markdown';
import useStdoutDimensions from './hooks/useStdoutDimensions';

interface TaskDetailProps {
  task: Task;
}

// Helper function to calculate subtask progress
const calculateProgress = (subtasks: Subtask[]): number => {
  if (!subtasks || subtasks.length === 0) {
    return 0;
  }
  const completed = subtasks.filter((s) => s.status === 'done').length;
  return completed / subtasks.length;
};

const TaskDetail: React.FC<TaskDetailProps> = ({ task }) => {
  const subtaskProgress = calculateProgress(task.subtasks ?? []);
  const [width, height] = useStdoutDimensions()

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="green" width={width - 20}>
      {/* Header Section */}
      <Box marginBottom={1} alignItems="center">
        <Text bold>ID: {task.id}</Text>
        <Spacer />
        <StatusLabel status={task.status} />
      </Box>
      <Box marginBottom={1}>
        <Text bold>Title: </Text>
        <Text wrap="truncate-end">{task.title}</Text>
      </Box>

      <Divider title="Details" />

      {/* Metadata Section */}
      <Box marginBottom={1}>
        <Box width="50%">
          <Text bold>Priority: </Text>
          <Text>{task.priority || 'N/A'}</Text>
        </Box>
        <Box width="50%">
          <Text bold>Type: </Text>
          <Text>{task.type || 'N/A'}</Text>
        </Box>
      </Box>
      <Box marginBottom={1}>
        <Box width="50%">
          <Text bold>Complexity: </Text>
          <Text>{task.complexity || 'N/A'}</Text>
        </Box>
         <Box width="50%">
           <Text bold>Assignee: </Text>
           <Text>{task.assignee || 'N/A'}</Text>
         </Box>
      </Box>

      {/* Description Section */}
      {task.description && (
        <>
          <Divider />
          <Box marginBottom={1} flexDirection="column">
            <Text bold>Description:</Text>
            <Box borderStyle="single" paddingX={1}>
              <Markdown>{task.description}</Markdown>
            </Box>
          </Box>
        </>
      )}

      {/* Dependencies Section */}
      {task.dependencies && task.dependencies.length > 0 && (
        <>
          <Divider title="Dependencies" />
          <Box marginBottom={1}>
            <Text>{task.dependencies.join(', ')}</Text>
          </Box>
        </>
      )}

      {/* Subtasks Section */}
      {task.subtasks && task.subtasks.length > 0 && (
        <>
          <Divider title={`Subtasks (${(subtaskProgress * 100).toFixed(0)}%)`} />
          <Box marginBottom={1}>
             <ProgressBar percent={subtaskProgress} />
          </Box>
          <Box flexDirection="column" marginBottom={1}>
            {task.subtasks.map((subtask) => (
              <Box key={subtask.id} marginLeft={1}>
                <Text dimColor>└─ </Text>
                <Box width={4}>
                   <Text dimColor>{subtask.id}</Text>
                </Box>
                <Box flexGrow={1} marginRight={1}>
                   <Text wrap="truncate-end">{subtask.title}</Text>
                </Box>
                <StatusLabel status={subtask.status} />
              </Box>
            ))}
          </Box>
        </>
      )}

      {/* Timestamps Section */}
      <Divider />
      <Box>
        <Box width="50%">
          <Text bold>Created: </Text>
          <Text>{new Date(task.createdAt).toLocaleString()}</Text>
        </Box>
        <Box width="50%">
          <Text bold>Updated: </Text>
          <Text>{new Date(task.updatedAt).toLocaleString()}</Text>
        </Box>
      </Box>
    </Box>
  );
};

export default TaskDetail;