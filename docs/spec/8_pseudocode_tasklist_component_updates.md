# Pseudocode: Update `TaskList` Component

## 1. Overview

This pseudocode details the changes required for the `TaskList` React component (`src/cli/components/TaskList.tsx`) to render the refactored task list output. It will receive a pre-processed array of `DisplayTask` objects, including formatted IDs and emojis, and render them using the `Ink/Table` component.

## 2. File: `src/cli/components/TaskList.tsx`

```typescript
// --- IMPORTS ---
// Import React, Box, Text from 'ink'
// Import Table from './Ink/Table'
// Import DisplayTask type (defined in list.ts pseudocode or a shared types file)
// Import COLORS constants

// --- INTERFACES ---
// Update TaskListProps to accept DisplayTask[]
INTERFACE TaskListProps {
  tasks: DisplayTask[]; // Now expects the pre-processed array
  // isTree prop is removed
}

// --- COMPONENT ---
COMPONENT TaskList(props: TaskListProps): React.ReactElement
  // Destructure tasks from props
  tasks = props.tasks

  // TEST: Handles empty task list correctly
  IF tasks.length === 0 THEN
    RETURN <Text>No tasks found.</Text>
  ENDIF

  // TEST: Maps DisplayTask array to table data format correctly
  // Map DisplayTask objects to the data format expected by Ink/Table
  tableData = tasks.map((task: DisplayTask) => {
    RETURN {
      // Use the pre-formatted displayId which includes indentation/branch
      ID: task.displayId,
      // TEST: Title is displayed correctly
      Title: task.title,
      // Combine emoji and text for Status and Priority columns
      // TEST: Status emoji and text are combined correctly
      Status: `${task.statusEmoji} ${task.status}`,
      // TEST: Priority emoji and text are combined correctly
      Priority: `${task.priorityEmoji} ${task.priority ?? 'N/A'}`,
      Type: task.type ?? 'N/A',
      Dependencies: task.dependencies.join(', ') || '-',
      Children: task.childTaskIds.join(', ') || '-',
      // Add other relevant columns as needed
    }
  })

  // Define column indexes for the cell renderer
  columnIndexes = {
    ID: 0,
    Title: 1,
    Status: 2,
    Priority: 3,
    Type: 4,
    Dependencies: 5,
    Children: 6,
  }

  // TEST: Renders the Ink/Table component with correct data
  RETURN (
    <Box paddingX={1}>
      <Table data={tableData} cell={({ column, row = 0, children }) => {
        // children will now include the emoji, e.g., "✅ done"

        // Extract the core value (text part) for color lookup if needed
        // This might require adjusting how COLORS keys are defined or accessed
        coreValue = typeof children === 'string' ? children.split(' ').pop() : children

        SWITCH (column) {
          CASE columnIndexes['Status']:
            // TEST: Status column applies correct color based on core status value
            // Use coreValue (e.g., 'done') to look up color
            colorKey = coreValue as keyof typeof COLORS.status
            RETURN <Text color={COLORS.status[colorKey] || COLORS.text}>{children}</Text>

          CASE columnIndexes['Priority']:
            // TEST: Priority column applies correct color based on core priority value
            // Use coreValue (e.g., 'high') to look up color
            colorKey = coreValue as keyof typeof COLORS.priority
            RETURN <Text color={COLORS.priority[colorKey] || COLORS.text}>{children}</Text>

          CASE columnIndexes['Dependencies']:
          CASE columnIndexes['Children']:
            // TEST: Dependency/Children columns apply correct color
            RETURN <Text color={children !== '-' ? 'green' : 'gray'}>{children}</Text>

          // TEST: ID column renders pre-formatted displayId correctly
          CASE columnIndexes['ID']:
             // No special formatting needed here, displayId is pre-formatted
             RETURN <Text>{children}</Text>

          DEFAULT:
            // TEST: Default rendering works for other columns
            RETURN <Text>{children}</Text>
        }
      }}/>
    </Box>
  )
ENDCOMPONENT

// Export TaskList
```

## 3. Key Changes Summary

1.  **Props:** The `TaskListProps` interface now expects `tasks` to be of type `DisplayTask[]`. The `isTree` prop is removed.
2.  **No Tree Logic:** All conditional logic related to `isTree` and the recursive `renderNode` function are removed. The component now only handles rendering the table.
3.  **Data Mapping:**
    - The `tableData` mapping now directly uses the `displayId` field from the `DisplayTask` object for the `ID` column. This field contains the pre-calculated indentation and branch characters.
    - The `Status` and `Priority` fields in `tableData` are constructed by prepending the `statusEmoji` and `priorityEmoji` (also from `DisplayTask`) to the respective text values.
4.  **Cell Renderer:**
    - The `cell` function within the `Table` component receives the combined emoji and text (e.g., "✅ done").
    - It needs to potentially extract the core text value (e.g., "done") if the `COLORS` map keys are based on the text status/priority rather than the combined string. This pseudocode includes a basic `coreValue` extraction example.
    - The rendering logic for `ID` column is simplified as the formatting is already done.

## 4. Completion

With these changes, the `TaskList` component becomes a simpler presentation layer, relying on the command logic (`list.ts`) to prepare the data appropriately for either a flat or hierarchical table display.
