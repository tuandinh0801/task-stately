import React from 'react';
import { Text } from 'ink';
import { TaskStatus } from '../../types/task';
import { COLORS } from '../constants'; // Import the color constants

interface StatusLabelProps {
  status: TaskStatus;
}

const StatusLabel: React.FC<StatusLabelProps> = ({ status }) => {
  // Use the color mapping from constants
  // Provide a fallback color if status is somehow not in the map
  const color = COLORS.status[status] ?? COLORS.text;

  return <Text color={color}>{status}</Text>;
};

export default StatusLabel;