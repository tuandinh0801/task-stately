import React, { useState } from 'react';
import { Box, Text, useApp } from 'ink';
import ConfirmInput from './Ink/ConfirmInput';
import { TaskManager } from '../../core/TaskManager';
import SuccessMessage from './SuccessMessage';
import ErrorDisplay from './ErrorDisplay';
import { deleteTaskLogic } from '../commands/delete'; // Import the logic function

interface DeleteConfirmationProps {
  taskId: string;
  taskManager: TaskManager;
  cascade?: boolean; // Add cascade prop (optional)
  onComplete: () => void; // Callback to signal completion
}

const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  taskId,
  taskManager,
  cascade = false, // Destructure cascade with default value
  onComplete,
}) => {
  const [isConfirmed, setIsConfirmed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<boolean>(false);
  const { exit } = useApp(); // Use the useApp hook to get exit

  const handleConfirm = async (confirmed: boolean) => {
    if (confirmed) {
      try {
        // Pass cascade to the logic function
        const result = await deleteTaskLogic(taskManager, taskId, cascade);
        if (result) {
          setDeleted(true);
        } else {
          // This case might indicate the task was deleted between prompt and confirmation
          setError(`Task with ID "${taskId}" not found.`);
        }
        setIsConfirmed(true); // Mark as confirmed to trigger final message render
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred during deletion.');
        setIsConfirmed(true); // Mark as confirmed to show error
      } finally {
        onComplete(); // Signal completion regardless of success/failure
        setTimeout(exit, 100); // Exit shortly after rendering final message
      }
    } else {
      setIsConfirmed(false); // User cancelled
      onComplete(); // Signal completion
      setTimeout(exit, 100); // Exit shortly after rendering cancel message
    }
  };

  // Render final messages after confirmation/cancellation
  if (isConfirmed === true) {
    if (deleted) {
      const message = cascade
        ? `Task with ID "${taskId}" and its children deleted successfully.`
        : `Task with ID "${taskId}" deleted successfully.`;
      return <SuccessMessage message={message} />;
    }
    if (error) {
      process.exitCode = 1; // Set exit code for errors
      return <ErrorDisplay error={error} />;
    }
    // Should ideally not reach here if confirmed and no error/deleted status
    return <Text>Processing...</Text>;
  }

  if (isConfirmed === false) {
    return <Text>Deletion cancelled.</Text>;
  }

  // Initial confirmation prompt - adjust message based on cascade
  const confirmationMessage = cascade
    ? `Are you sure you want to delete task "${taskId}" AND all its child tasks recursively? (y/N) `
    : `Are you sure you want to delete task "${taskId}"? (y/N) `;

  return (
    <Box>
      <Text color="yellow">{confirmationMessage}</Text>
      <ConfirmInput onSubmit={handleConfirm} />
    </Box>
  );
};

export default DeleteConfirmation;