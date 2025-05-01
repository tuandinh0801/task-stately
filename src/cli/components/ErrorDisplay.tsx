import React from 'react';
import { Box, Text } from 'ink';
import { COLORS } from '../constants'; // Import color constants

interface ErrorDisplayProps {
  error: Error | string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => {
  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <Box
      borderStyle="round"
      borderColor={COLORS.feedback.error} // Use constant
      paddingX={1}
      marginY={1}
    >
      <Text color={COLORS.feedback.error}>Error: {errorMessage}</Text>
    </Box>
  );
};

export default ErrorDisplay;