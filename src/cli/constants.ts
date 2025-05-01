// Define consistent colors for CLI output

export const COLORS = {
  status: {
    pending: 'yellow',
    'in-progress': 'blue',
    review: 'magenta',
    done: 'green',
    blocked: 'red',
    cancelled: 'gray',
  },
  priority: {
    low: 'gray',
    medium: 'white', // Default or standard priority
    high: 'yellow',
    critical: 'red',
  },
  feedback: {
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'blue',
    dim: 'gray', // For less important text like timestamps or help hints
  },
  border: 'gray',
  highlight: 'blue', // For selected items in lists
  text: 'white', // Default text color
  label: 'white', // Default label color (often used with bold)
};

// Example usage:
// import { COLORS } from './constants';
// <Text color={COLORS.status.pending}>Pending</Text>
// <Text color={COLORS.feedback.error}>Error message</Text>