import { DisplayTask } from '../commands/list'; // Import DisplayTask from list.ts
import React from 'react';
import { Box, Text } from 'ink';
import Table from './Ink/Table';

interface TaskListProps {
  tasks: DisplayTask[];
}

const TaskList: React.FC<TaskListProps> = ({ tasks }) => {
  if (!tasks.length) return <Text>No tasks found.</Text>;

  // Table mapping
  const tableData = tasks.map(task => ({
    ID: task.displayId,
    Title: task.title,
    Status: `${task.statusEmoji} ${task.status}`,
    Priority: task.priority ? `${task.priorityEmoji} ${task.priority}` : 'N/A',
    Parent: task.parentTaskId || '-',
    Depth: task.depth,
    Type: task.type,
    Complexity: task.complexity ?? 'N/A',
    Tags: task.tags.join(', ') || '-',
    Dependencies: task.dependencies.join(', ') || '-',
    Children: task.childTaskIds.join(', ') || '-',
    Assignee: task.assignee || '-',
    CreatedAt: new Date(task.createdAt).toLocaleString(),
    UpdatedAt: new Date(task.createdAt).toLocaleString(),
  }));

  const columnIndexes = {
    ID: 0,
    Title: 1,
    Status: 2,
    Priority: 3,
    Parent: 4,
    Depth: 5,
    Type: 6,
    Complexity: 7,
    Tags: 8,
    Dependencies: 9,
    Children: 10,
    Assignee: 11,
    CreatedAt: 12,
    UpdatedAt: 13,
  };

  return (
    <Box paddingX={1}>
      <Table data={tableData} cell={({ column, row = 0, children }) => {
        switch (column) {
          case columnIndexes['Status']:
            const statusText = children?.toString() || '';
            return <Text color={statusText.includes('✅') ? 'green' : undefined}>{children}</Text>;
          case columnIndexes['Priority']:
            const priorityText = children?.toString() || '';
            return <Text color={priorityText.includes('🔴') ? 'red' : priorityText.includes('🟡') ? 'yellow' : priorityText.includes('🟢') ? 'green' : undefined}>{children}</Text>

          case columnIndexes['Dependencies']:
          case columnIndexes['Children']:
            const dependencyText = children?.toString() || '';
            return <Text color={dependencyText ? 'blueBright' : undefined}>{children}</Text>;
          default:
            return <Text>{children}</Text>;
        }
      }} />
    </Box>
  );
};

export default TaskList;
