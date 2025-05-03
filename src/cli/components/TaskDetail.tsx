import React from 'react';
import { Box, Text, Spacer } from 'ink';
import Divider from 'ink-divider';
import { Task } from '@/types/task';
import Markdown from './Ink/Markdown';
import useStdoutDimensions from './hooks/useStdoutDimensions';
import { COLORS } from '../constants';

interface TaskDetailProps {
  task: Task;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ task }) => {
  const [width, height] = useStdoutDimensions();

  return (
    <Box
      flexDirection="column"
      padding={1}
      borderStyle="round"
      borderColor="green"
      width={width - 20}
    >
      {/* Header Section */}
      <Box marginBottom={1} alignItems="center">
        <Text bold>ID: {task.id}</Text>
        <Spacer />
        <Text color={COLORS.status[task.status]} />
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

      {/* Hierarchical Task Info */}
      {task.parentTaskId && (
        <Box marginBottom={1}>
          <Text bold>Parent Task: </Text>
          <Text>{task.parentTaskId}</Text>
        </Box>
      )}
      {task.childTaskIds && task.childTaskIds.length > 0 && (
        <Box marginBottom={1}>
          <Text bold>Child Tasks: </Text>
          <Text>{task.childTaskIds.join(', ')}</Text>
        </Box>
      )}

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
