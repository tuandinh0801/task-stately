# Requirements: Refactor `list` Command Output

## 1. Overview

This document outlines the requirements for refactoring the `task-stately list` command output. The goal is to replace the current `--tree` view option with a more refined table-based hierarchical display controlled by a new `--with-subtasks` flag, and enhance visual clarity with emojis.

## 2. Functional Requirements

### 2.1. Output Format

    - **FR-LIST-001:** The `list` command MUST always display tasks in a tabular format using the `Ink/Table` component.
    - **FR-LIST-002:** The `--tree` option MUST be removed from the `list` command.

### 2.2. Task Filtering (Hierarchy)

    - **FR-LIST-003:** By default (without any specific hierarchy flag), the `list` command MUST display only top-level tasks (tasks where `parentTaskId` is null or undefined).
    - **FR-LIST-004:** A new boolean option `--with-subtasks` (alias `-w`) MUST be added to the `list` command.
    - **FR-LIST-005:** If `--with-subtasks` is specified, the `list` command MUST display all tasks, including top-level tasks and all their descendants, sorted appropriately to maintain visual hierarchy (e.g., parent followed immediately by its children).

### 2.3. Hierarchical Display (Indentation)

    - **FR-LIST-006:** When `--with-subtasks` is specified, the `ID` column MUST be formatted to visually represent the task hierarchy.
    - **FR-LIST-007:** The indentation MUST use leading spaces (e.g., two spaces per depth level).
    - **FR-LIST-008:** An ASCII branch character (e.g., `└─ ` for the last child, `├─ ` for others) MUST be prepended to the ID of child tasks (depth > 0). Top-level tasks (depth 0) should have no branch character or indentation.
    - **FR-LIST-009:** All other columns in the table MUST remain vertically aligned, regardless of the indentation in the `ID` column.

### 2.4. Visual Enhancements (Emojis)

    - **FR-LIST-010:** Emojis MUST be prepended to the text in the `Status` column to provide quick visual identification.
        - `pending`: ⏳
        - `in-progress`: 🚧
        - `review`: 👀
        - `done`: ✅
        - `blocked`: 🚫
        - `cancelled`: ❌
        - *(Fallback: Use status text only if emoji mapping is missing)*
    - **FR-LIST-011:** Emojis MUST be prepended to the text in the `Priority` column.
        - `low`: ⬇️
        - `medium`: ➖
        - `high`: ⬆️
        - `critical`: 🔥
        - *(Fallback: Use priority text only if emoji mapping is missing)*

### 2.5. Existing Functionality

    - **FR-LIST-012:** Existing filtering options (e.g., `--status`) MUST continue to function correctly in conjunction with the new hierarchy display.
    - **FR-LIST-013:** Existing sorting options (e.g., `--sort-by`) MUST continue to function. When `--with-subtasks` is used, sorting should primarily apply to sibling tasks within the same parent, preserving the overall parent-child structure. Top-level tasks should also be sorted.

## 3. Non-Functional Requirements

- **NFR-LIST-001:** Performance: Calculating task depth and rendering the indented list should be reasonably performant for a moderate number of tasks (e.g., < 1000).
- **NFR-LIST-002:** Readability: The indented table view should be clear and easy to parse visually.

## 4. Edge Cases

- **EC-LIST-001:** Tasks with non-existent `parentTaskId` (orphaned tasks): Treat as top-level tasks.
- **EC-LIST-002:** Empty task list: Display a "No tasks found." message (handled by `TaskList` component).
- **EC-LIST-003:** Invalid status/priority values in data: The display should gracefully handle this, potentially showing the raw value or a default indicator/emoji.

## 5. TDD Anchors (Conceptual)

- Test default view shows only top-level tasks.
- Test `--with-subtasks` shows parent and child tasks.
- Test indentation level is correct based on depth.
- Test ASCII branch characters are correct (├─, └─).
- Test other columns remain aligned with indentation.
- Test status emojis are displayed correctly.
- Test priority emojis are displayed correctly.
- Test filtering (`--status`) works with `--with-subtasks`.
- Test sorting (`--sort-by`) works correctly within hierarchy levels.
- Test handling of orphaned tasks.
