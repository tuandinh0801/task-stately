# Task-Stately: Phase 3 Improvement Detailed Plan: CLI UI/UX Enhancements

**Goal:** Enhance the `task-stately` CLI's user interface and experience by adding interactivity, improving visual presentation, and incorporating elements inspired by the Task Master CLI, utilizing core Ink components and individual Ink community packages.

**Prerequisites:**
*   Phase 1, 2, and 3 are complete. The basic CLI commands (`list`, `show`, `add`, `update`, `delete`, `init`) are functional.
*   Core components (`TaskList`, `TaskDetail`, `StatusLabel`, etc.) exist.
*   Project uses Ink/React for CLI rendering.

**Inspiration Analysis (Task Master CLI):**
*   **Dashboard:** Central overview with progress stats, dependency metrics, and next task suggestions. Uses progress bars and clear sections.
*   **Task List:** Table format with clear columns (ID, Title, Status, Type, Complexity, Priority, Dependencies).
*   **Task Detail:** Well-structured layout showing all task attributes, subtasks with progress, acceptance criteria, and suggested actions.
*   **Help Screen:** Categorized commands with clear descriptions and argument/option usage.
*   **Interactivity:** Implied ability to select tasks, trigger actions (start, complete), and navigate.

**Relevant Ink/React Components & Concepts (Revised):**
*   **Core Ink:**
    *   `<Box>`: For structure, flexbox layout, padding, margin, borders.
    *   `<Text>`: For displaying text with styling (color, bold, italic, `dimColor`, `wrap`).
    *   `<Spacer>`: For flexible space within `<Box>`.
    *   `<Newline>`: For line breaks.
    *   `<Static>`: For rendering non-updating sections.
    *   `<Transform>`: For advanced text transformations.
    *   Hooks: `useInput`, `useFocusManager`, `useFocus`, `useApp`, `useStdin`, `useStdout`, `useStderr`.
*   **Individual Ink Component Packages:**
    *   `ink-text-input`: For user text input.
    *   `ink-select-input`: For interactive single item selection.
    *   `ink-multi-select`: For interactive multiple item selection.
    *   `ink-confirm-input`: For yes/no confirmations.
    *   `ink-progress-bar`: For displaying progress.
    *   `ink-spinner`: For indicating loading.
    *   `ink-table`: For table layouts.
    *   `ink-link`: For rendering clickable links (if needed).
    *   `ink-divider`: For visual separation.
    *   (Others like `ink-gradient`, `ink-big-text`, `ink-markdown` might be useful for specific visual flair later).
*   **State Management:** React's `useState`, `useReducer`.

---

## Detailed Steps & Rationale

**1. Install Individual Component Packages:**
*   **Action:** Add the required individual Ink component packages. Start with the core ones needed for interactivity and presentation.
    ```bash
    pnpm add ink-text-input ink-select-input ink-confirm-input ink-progress-bar ink-spinner ink-table ink-multi-select
    ```
*   **Rationale:** Makes the necessary pre-built UI components available for use, replacing the deprecated `ink-ui`.

**2. Refactor `TaskList` Component (`src/cli/components/TaskList.tsx`):**
*   **Action:** Modify `TaskList` to use `ink-table` for a structured table layout.
    *   Import `Table` from `ink-table`.
    *   Define columns: ID, Title, Status, Priority, Type, #Deps, #Subtasks.
    *   Format task data appropriately for the `data` prop of `<Table>`.
    *   Use `StatusLabel` within the table cell rendering logic.
*   **Action:** Add optional props for highlighting a specific row/task.
*   **Action:** Consider adding a simple `ink-progress-bar` component within the table for tasks with subtasks.
*   **Rationale:** Improves the clarity and alignment of the task list using a dedicated table component.

**3. Implement Interactive List Mode:**
*   **Action:** Create a new command or flag (e.g., `task-stately interactive`).
*   **Action:** Create `InteractiveTaskList.tsx`.
    *   Fetch tasks, show `ink-spinner` while loading.
    *   Use `ink-select-input` component to display tasks. Format task data for the `items` prop.
    *   Use `useState` for selected item/view state.
    *   Implement the `onSelect` handler for `ink-select-input`. Transition view to show details or an action menu.
    *   Use `useInput` for global keybindings (quit, add, filter). Consider using `ink-text-input` for filtering.
    *   Use `useFocusManager` to manage focus between the list, filter input, and action menus.
*   **Rationale:** Introduces core interactivity using maintained, individual components.

**4. Enhance `TaskDetail` Component (`src/cli/components/TaskDetail.tsx`):**
*   **Action:** Reorganize layout using `<Box>`, `<Spacer>`, padding, margins, borders. Use `ink-divider` for visual separation between sections.
    *   Clear sections: Description, Metadata, Dependencies, Subtasks, etc.
*   **Action:** Improve subtask display using `StatusLabel` and `ink-progress-bar`.
*   **Action:** Improve dependency display.
*   **Action:** Use `<Text wrap="...">` for long fields.
*   **Rationale:** Makes details more informative and visually organized using core Ink and specific components.

**5. Implement Confirmation for Destructive Actions:**
*   **Action:** Modify the `delete` command action (`src/cli/commands/delete.ts`).
*   **Action:** Before calling `taskManager.deleteTask()`, render the `ink-confirm-input` component, prompting the user.
*   **Action:** Only proceed with deletion if the confirmation callback indicates 'yes'.
*   **Rationale:** Adds a safety layer using the standard confirmation component.

**6. (Optional) Implement Dashboard View:**
*   **Action:** Create `dashboard` command and `Dashboard.tsx` component.
*   **Action:** Fetch tasks, show `ink-spinner`.
*   **Action:** Calculate stats.
*   **Action:** Display stats using `<Box>`, `<Text>`, `<Spacer>`, `ink-divider`, and `ink-progress-bar`. Consider `<Static>` for stable sections.
*   **Rationale:** Provides a high-level project overview.

**7. Improve Command Help and Structure:**
*   **Action:** Enhance command/option descriptions in Commander.
*   **Action:** Consider command grouping if needed.
*   **Action:** Ensure consistent arguments/flags.
*   **Rationale:** Improves CLI discoverability and usability.

**8. Add Visual Flair and Consistency:**
*   **Action:** Define a consistent color scheme (e.g., in a shared `constants.ts`) for statuses, priorities, feedback.
*   **Action:** Use `<Box>` properties consistently for structure.
*   **Action:** Use custom `ErrorDisplay`/`SuccessMessage` components styled with core Ink `<Text>` and `<Box>`, applying colors from the constants file.
*   **Action:** Ensure `ink-spinner` is used for loading states.
*   **Rationale:** Creates a polished look and feel using core Ink styling capabilities.

**9. Testing Interactive Components:**
*   **Action:** Write tests for new/modified interactive components (`InteractiveTaskList`, `Dashboard`, commands using `ink-confirm-input`).
*   **Action:** Use Ink/React testing utilities to simulate input and assert output/state changes.
*   **Action:** Test focus management and edge cases.
*   **Rationale:** Ensures reliability of interactive features.

---

## Visual Plan (Mermaid)

```mermaid
graph TD
    subgraph Phase 3 Improvement: CLI UI/UX Enhancements
        P3Imp_Start((Start Phase 3 Improvement)) --> P3Imp_S0(1. Install Ink Component Pkgs);
        P3Imp_S0 --> P3Imp_S1(2. Refactor TaskList w/ ink-table, ink-progress-bar);
        P3Imp_S1 --> P3Imp_S2(3. Implement Interactive List w/ ink-select-input);
        P3Imp_S1 --> P3Imp_S3(4. Enhance TaskDetail w/ ink-progress-bar, ink-divider);
        P3Imp_S2 --> P3Imp_S3; # Interactive list might show enhanced detail
        P3Imp_S3 --> P3Imp_S3b(5. Add ink-confirm-input to Delete);
        P3Imp_S3b --> P3Imp_S4(6. Optional: Implement Dashboard);
        P3Imp_S4 --> P3Imp_S5(7. Improve Help/Structure);
        P3Imp_S5 --> P3Imp_S6(8. Add Visual Flair w/ Custom Styling);
        P3Imp_S6 --> P3Imp_S7(9. Test Interactive Components);
        P3Imp_S7 --> P3Imp_End((End Phase 3 Improvement));

        subgraph P3Imp_S1_Sub [Refactor TaskList]
            UseTable(Use ink-table)
            AddHighlight(Add highlighting)
            AddSubtaskProgress(Use ink-progress-bar)
        end

        subgraph P3Imp_S2_Sub [Interactive List]
            NewCommand(New command/flag)
            NewComponent(Create InteractiveTaskList.tsx)
            UseSelect(Use ink-select-input)
            HandleSelection(Implement onSelect handler)
            UseInputHook(Use useInput / ink-text-input)
            UseFocusMgmt(Use useFocusManager)
        end

         subgraph P3Imp_S3_Sub [Enhance TaskDetail]
            ImproveLayout(Reorganize layout w/ Box, Spacer, ink-divider)
            ImproveSubtasks(Use ink-progress-bar)
            ImproveDeps(Improve dependency display)
            AddWrapping(Use Text wrap)
        end

        P3Imp_S1 --> P3Imp_S1_Sub;
        P3Imp_S2 --> P3Imp_S2_Sub;
        P3Imp_S3 --> P3Imp_S3_Sub;

    end

    style P3Imp_S0 fill:#eee,stroke:#333,stroke-width:1px
    style P3Imp_S1 fill:#f9f,stroke:#333,stroke-width:2px
    style P3Imp_S2 fill:#ccf,stroke:#333,stroke-width:2px
    style P3Imp_S3 fill:#cfc,stroke:#333,stroke-width:2px
    style P3Imp_S3b fill:#cff,stroke:#333,stroke-width:2px
    style P3Imp_S6 fill:#fcf,stroke:#333,stroke-width:2px
    style P3Imp_S7 fill:#ffc,stroke:#333,stroke-width:2px
```

---

## Actionable Subtasks (High-Level)

*   **Subtask 3Imp.0:** Install individual Ink component packages (`ink-text-input`, `ink-select-input`, etc.).
*   **Subtask 3Imp.1:** Refactor `TaskList.tsx` (using `ink-table`, `ink-progress-bar`).
*   **Subtask 3Imp.2:** Create `InteractiveTaskList.tsx` using `ink-select-input`, `ink-text-input` (optional), `useInput`, `useFocusManager`.
*   **Subtask 3Imp.3:** Implement navigation/action logic within `InteractiveTaskList`.
*   **Subtask 3Imp.4:** Enhance `TaskDetail.tsx` layout (`<Box>`, `<Spacer>`, `<Text wrap>`, `ink-divider`, `ink-progress-bar`).
*   **Subtask 3Imp.5:** Modify `delete` command to use `ink-confirm-input`.
*   **Subtask 3Imp.6:** (Optional) Create `Dashboard.tsx` component and command.
*   **Subtask 3Imp.7:** Review/improve Commander help text.
*   **Subtask 3Imp.8:** Define color constants, apply consistent styling, ensure `ink-spinner` usage, use custom feedback components.
*   **Subtask 3Imp.9:** Implement tests for interactive components and features.

---

**Phase 3 Improvement Overall Outcome:** An enhanced `task-stately` CLI with improved visual presentation and core interactivity, providing a more user-friendly experience inspired by Task Master, leveraging relevant individual Ink component packages.