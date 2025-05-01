# 6. Component Reference

This document provides details on the reusable Ink UI components used within the Task Stately CLI.

---

## Component: `InteractiveTaskList`

### Purpose
Displays a list of tasks with interactive elements, allowing users to select tasks for actions like viewing details or updating status.

### Usage
Used internally by commands like `list` and `show` to present tasks to the user.

### Props
*(Internal component, props not directly exposed via CLI)*

### Notes
Provides a more dynamic way to interact with tasks compared to a static list.

---

## Component: `DeleteConfirmation`

### Purpose
Presents a confirmation prompt to the user before executing a destructive action, specifically task deletion.

### Usage
Used internally by the `delete` command.

### Props
- `task`: The task object to be deleted.
- `onConfirm`: Callback function executed if the user confirms deletion.
- `onCancel`: Callback function executed if the user cancels deletion.

### Notes
Enhances safety by preventing accidental task deletions.

---

## Component: `StatusLabel`

### Purpose
Displays the status of a task (`pending`, `in-progress`, `completed`) with appropriate color coding for visual distinction.

### Usage
Used within `InteractiveTaskList` and `TaskDetail` to show task status.

### Props
- `status`: The task status string.

### Notes
Improves readability of task lists and details.

---

## Component: `SuccessMessage`

### Purpose
Displays a confirmation message to the user upon successful completion of an action (e.g., task added, updated, deleted).

### Usage
Used by various commands (`add`, `update`, `delete`) to provide positive feedback.

### Props
- `message`: The success message string to display.

---

## Component: `ErrorDisplay`

### Purpose
Displays error messages to the user in a standardized format when an operation fails.

### Usage
Used globally to handle and display errors encountered during command execution.

### Props
- `error`: The error object or message string.

---

## Component: `TaskDetail`

### Purpose
Displays the full details of a specific task.

### Enhancements
- Now utilizes the `StatusLabel` component for clearer status indication.
- Improved layout for better readability of task properties (ID, Title, Description, Status, Due Date, Dependencies).

### Usage
Used by the `show` command and potentially within interactive flows.

### Props
- `task`: The task object to display details for.

---

*For command usage, see [4_user_guide.md](4_user_guide.md).*