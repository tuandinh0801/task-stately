# Specification: Interactive Mode for `add` and `update` Commands

This document outlines the specification for adding an interactive mode to the `add` and `update` commands in the `task-stately` CLI.

## 1. Requirements Summary

The goal is to provide an interactive prompt-based flow for creating and updating tasks, improving the user experience for entering detailed information like descriptions, tags, and acceptance criteria.

## 2. Trigger Mechanism

-   **Proposal:** Introduce a `--interactive` flag for both `add` and `update` commands.
    -   `task-stately add --interactive`
    -   `task-stately update <id> --interactive`
-   **Alternative (Optional):** Automatically trigger interactive mode if required arguments (like `--title` for `add`) are missing. However, the explicit flag (`--interactive`) provides clearer user control and is recommended as the primary trigger.
-   **Behavior:** If `--interactive` is present, the CLI ignores other provided options (like `--title`, `--description`) for the corresponding fields and prompts the user interactively instead. Options *not* covered by the interactive flow (e.g., `--file`) should still be respected.

## 3. UI Library Choice (inquirer)

-   **Recommendation:** Utilize the `inquirer` library for handling interactive prompts.
    -   **Single-line text:** `input` type (for Title, Assignee).
    -   **Multi-line text:** `editor` type (for Description, potentially Criteria). This opens the user's default editor. Alternatively, use `input` for simpler multi-line needs if `editor` is too heavy.
    -   **Selection:** `list` type (for Priority, Type, Status). Choices should be derived from the respective Zod schemas or enums (`TaskPriority`, `TaskType`, `TaskStatus`).
    -   **Arrays (Tags, Criteria):** Can be handled in several ways:
        -   Looping `input`: Ask for one item at a time until the user enters an empty string.
        -   Single `input` with separator: Ask for comma-separated values and parse the string.
        -   `editor`: Allow the user to enter multiple lines, then parse each line as an item.
        -   The looping `input` is often the most straightforward for the user.
    -   **Confirmation:** `confirm` type before submitting the data to the core logic.

## 4. Interactive Flow: `add` Command

Triggered by `task-stately add --interactive`.

1.  **Prompt: Title** (Required)
    -   Component: `inquirer` prompt type: `input`
    -   Validation: Non-empty string.
2.  **Prompt: Description** (Optional)
    -   Component: `inquirer` prompt type: `editor` or `input`
    -   Validation: String.
3.  **Prompt: Priority** (Optional)
    -   Component: `inquirer` prompt type: `list`
    -   Choices: `low`, `medium`, `high` (from `TaskPrioritySchema`)
    -   Default: `medium`
    -   Validation: Matches `TaskPrioritySchema`.
4.  **Prompt: Type** (Optional)
    -   Component: `inquirer` prompt type: `list`
    -   Choices: `feature`, `bug`, `chore`, etc. (from `TaskTypeSchema`)
    -   Default: `feature`
    -   Validation: Matches `TaskTypeSchema`.
5.  **Prompt: Status** (Optional)
    -   Component: `inquirer` prompt type: `list`
    -   Choices: `pending`, `in-progress`, `done`, etc. (from `TaskStatusSchema`)
    -   Default: `pending`
    -   Validation: Matches `TaskStatusSchema`.
6.  **Prompt: Tags** (Optional, Array)
    -   Component: Looping `inquirer` prompt type: `input`.
    -   Prompt Text: "Enter tag (leave empty to finish):"
    -   Validation (each tag): Non-empty string.
7.  **Prompt: Acceptance Criteria** (Optional, Array)
    -   Component: Looping `inquirer` prompt type: `editor` or `input`.
    -   Prompt Text: "Enter acceptance criterion (leave empty to finish):"
    -   Validation (each criterion): Non-empty string.
8.  **Prompt: Assignee** (Optional)
    -   Component: `inquirer` prompt type: `input`
    -   Validation: String.
9.  **Confirmation:** `inquirer` prompt type: `confirm` - "Create task with the above details?"
10. **Action:** If confirmed, pass collected data to `addTaskLogic`.

## 5. Interactive Flow: `update` Command

Triggered by `task-stately update <id> --interactive`.

1.  **Fetch Task:** Retrieve the existing task data using the provided `<id>`. Handle errors if the task is not found.
2.  **Prompt Sequence:** Iterate through the same fields as the `add` command (Title, Description, Priority, etc.).
    -   **Defaults:** For each prompt, display the *current* value of the field from the fetched task data as the default or initial input value.
    -   **Skipping:** Allow the user to skip updating a field (e.g., by submitting the default value without changes, or pressing Enter on an empty input if the field is optional). The prompt should indicate how to skip (e.g., "Press Enter to keep current value: [current value]").
    -   **Component:** Use the same `inquirer` prompt types as in the `add` flow.
    -   **Validation:** Apply the same validation rules.
3.  **Confirmation:** `inquirer` prompt type: `confirm` - "Update task <id> with the changes?" (Potentially show a diff or summary of changes).
4.  **Action:** If confirmed, merge the *changed* interactive data with the existing task data and pass the result to `updateTaskLogic`. Only include fields that the user explicitly provided new values for.

## 6. Input Handling

-   **General:** `inquirer.prompt()` returns a promise resolving to an object where keys are the `name` of each prompt and values are the user's answers.
-   **Text (`input`):** Returns the entered string.
-   **Multi-line Text (`editor`):** Returns a single string, potentially containing newlines, captured from the external editor.
-   **Selection (`list`):** Returns the chosen value from the `choices` array.
-   **Arrays (Looping `input`):** Requires custom logic outside the direct `inquirer.prompt` call to loop until an empty input is received, collecting results into an array.
-   **Arrays (Comma-separated `input`):** Parse the resulting string (split by comma, trim whitespace).
-   **Confirmation (`confirm`):** Returns a boolean (`true` for yes, `false` for no).
-   **Skipping (Update):** Check if the answer provided by `inquirer` for a field differs from the `default` value (which should be set to the existing task's value). If it's the same, the user likely skipped or didn't change it.

## 7. Validation

-   **Integration:** Use the existing Zod schemas (`TaskSchema`, `TaskPrioritySchema`, `TaskStatusSchema`, `TaskTypeSchema`, etc.) defined in `src/types/task.ts`.
-   **Timing:** Validation can occur:
    -   *Inline:* Validate each input as the user types or submits the field (more complex UI).
    -   *Post-Collection:* Collect all interactive inputs into a data object, then validate this object against the relevant Zod schema (`TaskSchema.partial()` for update, `TaskSchema` without ID/timestamps for add) before passing it to the core logic function. This is simpler to implement initially.
-   **Error Feedback:** If validation fails post-collection, display clear errors (e.g., using `console.error` or a dedicated error display function) and potentially re-prompt or exit. `inquirer`'s `validate` function on prompts allows for inline validation.

## 8. Integration with Core Logic

-   `inquirer.prompt()` resolves with an `answers` object containing the collected data (e.g., `answers: Partial<Task>`).
-   In the `action` handler of `add.ts` and `update.ts`:
    -   Check if the `--interactive` flag is set.
    -   If yes:
        -   Define the array of `inquirer` questions (`addQuestions`).
        -   Call `const answers = await inquirer.prompt(addQuestions);`.
        -   Perform validation on the `answers` object.
        -   For `add`: Call `addTaskLogic(validatedAnswers)`.
        -   For `update`: Fetch the `existingTask`, define `updateQuestions` using `existingTask` for defaults, call `inquirer.prompt`, validate `answers`, merge *changed* `answers` with `existingTask`, and call `updateTaskLogic(id, mergedData)`.
    -   If no:
        -   Proceed with the existing logic, parsing options directly from `program.opts()`.

## 9. Pseudocode

### `src/cli/commands/add.ts` (action handler)

```typescript
// TDD Anchor: Test command registration and options
// TEST: 'add' command exists
// TEST: '--interactive' flag is registered

async function action(options: AddCommandOptions) {
  // TDD Anchor: Test non-interactive path
  // TEST: Calls addTaskLogic with parsed options when not interactive

  // TDD Anchor: Test interactive path trigger
  // TEST: Enters interactive mode when --interactive flag is present
  if (options.interactive) {
    try {
      // Define questions for inquirer based on Section 4
      // TEST: Questions include 'title' (input)
      // TEST: Questions include 'description' (editor/input)
      // TEST: Questions include 'priority' (list) with default 'medium'
      // TEST: Questions include 'type' (list) with default 'feature'
      // TEST: Questions include 'status' (list) with default 'pending'
      // TEST: Logic exists to handle array input for 'tags' (e.g., looping input)
      // TEST: Logic exists to handle array input for 'criteria' (e.g., looping input)
      // TEST: Questions include 'assignee' (input)
      // TEST: Questions include final 'confirm' prompt
      const addQuestions = createAddQuestions(); // Helper to generate question array
      const answers = await inquirer.prompt(addQuestions); // May need separate logic for looping arrays

      // TEST: Validation is called after interactive input
      // Validate answers against TaskSchema (or relevant parts)
      const validatedData = validateInput(answers); // Throws on error

      // TEST: addTaskLogic is called with validated interactive data
      await addTaskLogic(validatedData);

      // Display success message
      // TEST: Success message is shown after adding task interactively
    } catch (error) {
      // Display error message (validation or other errors)
      // TEST: Error message is shown if interactive validation fails
      // TEST: Error message is shown if addTaskLogic fails in interactive mode
    }
  } else {
    // Existing non-interactive logic
    // TEST: Parses options correctly in non-interactive mode
    const taskData = parseOptionsToTaskData(options);
    // TEST: Validation is called for non-interactive options
    const validatedData = validateInput(taskData); // Throws on error
    await addTaskLogic(validatedData);
    // Display success message
    // TEST: Success message is shown after adding task non-interactively
  }
}
```

### `src/cli/commands/update.ts` (action handler)

```typescript
// TDD Anchor: Test command registration and options
// TEST: 'update' command exists with <id> argument
// TEST: '--interactive' flag is registered

async function action(id: string, options: UpdateCommandOptions) {
  // TDD Anchor: Test non-interactive path
  // TEST: Calls updateTaskLogic with parsed options when not interactive

  // TDD Anchor: Test interactive path trigger
  // TEST: Enters interactive mode when --interactive flag is present
  if (options.interactive) {
    try {
      // TEST: Fetches existing task data before showing interactive form
      const existingTask = await getTaskByIdLogic(id); // Assume this exists or is part of updateTaskLogic setup
      if (!existingTask) {
        // throw error or display message Task not found
        // TEST: Handles task not found error in interactive mode
      }

      // Define questions for inquirer based on Section 5, using existingTask for defaults
      // TEST: Questions use existing task 'title' as default
      // TEST: Logic handles skipping fields (comparing answer to default)
      // TEST: Questions use existing task data for all relevant field defaults
      const updateQuestions = createUpdateQuestions(existingTask); // Helper
      const answers = await inquirer.prompt(updateQuestions); // May need separate logic for looping arrays

      // Identify only the fields that were actually changed by the user
      // TEST: Correctly identifies changed fields vs skipped fields
      const changes = filterChangedFields(existingTask, answers);

      // TEST: Validation is called for interactive changes
      // Validate changes against TaskSchema.partial()
      const validatedChanges = validateInputChanges(changes); // Throws on error

      // TEST: updateTaskLogic is called with ID and validated changes
      await updateTaskLogic(id, validatedChanges);

      // Display success message
      // TEST: Success message is shown after updating task interactively
    } catch (error) {
      // Display error message (validation, task not found, or other errors)
      // TEST: Error message is shown if interactive validation fails for update
      // TEST: Error message is shown if updateTaskLogic fails in interactive mode
    }
  } else {
    // Existing non-interactive logic
    // TEST: Parses options correctly in non-interactive update mode
    const updateData = parseOptionsToUpdateData(options);
    // TEST: Validation is called for non-interactive update options
    const validatedChanges = validateInputChanges(updateData); // Throws on error
    await updateTaskLogic(id, validatedChanges);
    // Display success message
    // TEST: Success message is shown after updating task non-interactively
  }
}

// Helper pseudofunctions (implementation details omitted)
function validateInput(data: any): ValidatedTaskData { /* ... */ }
function validateInputChanges(data: any): ValidatedPartialTaskData { /* ... */ }
function createAddQuestions(): inquirer.QuestionCollection { /* ... returns array of questions */ }
function createUpdateQuestions(existing: Task): inquirer.QuestionCollection { /* ... returns array of questions with defaults */ }
function filterChangedFields(existing: Task, answers: Partial<Task>): Partial<Task> { /* ... returns only fields where answer !== existing value */ }
function validateInput(data: any): ValidatedTaskData { /* ... */ }
function validateInputChanges(data: any): ValidatedPartialTaskData { /* ... */ }
function parseOptionsToTaskData(options: AddCommandOptions): PartialTaskData { /* ... */ }
function parseOptionsToUpdateData(options: UpdateCommandOptions): PartialTaskData { /* ... */ }