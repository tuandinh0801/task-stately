import React from 'react';
import { Box, Text } from 'ink';
import { COLORS } from '../constants'; // Import color constants

interface SuccessMessageProps {
  message: string;
}

const SuccessMessage: React.FC<SuccessMessageProps> = ({ message }) => {
  return (
    <Box
      borderStyle="round"
      borderColor={COLORS.feedback.success}
      paddingX={1}
      marginY={1}
    >
      <Text color={COLORS.feedback.success}>{message}</Text>
    </Box>
  );
};

export default SuccessMessage;
