# 4. User Guide

This guide covers the basic usage and command-line interface (CLI) functionalities of the Task Stately application.

## Listing Tasks (`list`)

The `list` command (alias `ls`) displays your tasks in a table format. By default, it shows only top-level tasks. The Status and Priority columns now include emojis (e.g., ⏳, ✅, ⬆️, ⬇️) for quick visual identification.

### Basic Usage

To list top-level tasks:

```bash
task-stately list
# or
task-stately ls
```

### Displaying Subtasks Hierarchically

To view all tasks, including subtasks indented hierarchically:

- `--with-subtasks` (alias `-w`): Display tasks hierarchically, showing subtask relationships with indentation and branch characters (└─, ├─).

Example: List all tasks hierarchically.
```bash
task-stately list --with-subtasks
# or
task-stately ls -w
```

### Filtering Tasks

You can filter tasks by their status:

- `--status <status>`: Filter by status (e.g., `pending`, `in-progress`, `completed`).

Example: List only pending tasks (including any pending subtasks if using `-w`).
```bash
task-stately list --status pending
```

### Sorting Tasks

You can sort tasks by various fields. Sorting applies within each level of the hierarchy when using `--with-subtasks`.

- `--sort-by <field>`: Sort by field (e.g., `id`, `title`, `status`, `priority`, `dueDate`).
- `--sort-order <order>`: Specify sort order (`asc` or `desc`, defaults to `asc`).

Example: List all tasks hierarchically, sorted by priority in descending order.
```bash
task-stately list -w --sort-by priority --sort-order desc
```

---

## Deleting Tasks (`delete`)

The `delete` command removes a task. It now includes a confirmation step to prevent accidental deletions.

### Basic Usage

To delete a task by its ID:

```bash
task-stately delete <task-id>
```

### Confirmation Prompt

When you run the `delete` command, you will be prompted to confirm the deletion:

```
? Are you sure you want to delete task "Task Title" (ID: 123)? (Y/n)
```

Press `Y` (or Enter) to confirm, or `N` to cancel.

---

*For component details, see [6_components_reference.md](6_components_reference.md).*
---

## Adding Tasks (`add`)

The `add` command creates a new task. You can specify task details using flags or enter interactive mode for guided input.

### Options

| Option        | Alias | Description                                      | Required |
|---------------|-------|--------------------------------------------------|----------|
| `--title`     | `-t`  | The title of the task                            | Yes*     |
| `--description`| `-d`  | A detailed description of the task               | No       |
| `--priority`  | `-p`  | Task priority (`low`, `medium`, `high`)          | No       |
| `--status`    | `-s`  | Task status (`todo`, `in-progress`, `done`)      | No       |
| `--interactive`| `-i`  | Enter interactive mode to be prompted for details | No       |

*\*Note: If `--title` is omitted and `--interactive` is not used, interactive mode will be triggered automatically.*

### Usage Examples

```bash
# Add task using flags
task-stately add --title "Setup project" --priority high

# Add task interactively (prompts for all details)
task-stately add --interactive

# Add task (will trigger interactive mode as --title is missing)
task-stately add --priority medium
```

### Interactive Mode

If you use the `--interactive` flag or omit required options (like `--title`), the CLI will guide you through creating the task using prompts powered by `inquirer`.

---

## Updating Tasks (`update`)

The `update` command modifies an existing task identified by its ID. You can specify which fields to update using flags or enter interactive mode.

### Arguments

- `<task-id>`: The ID of the task to update (Required).

### Options

| Option        | Alias | Description                                      |
|---------------|-------|--------------------------------------------------|
| `--title`     | `-t`  | Update the title of the task                     |
| `--description`| `-d`  | Update the description of the task               |
| `--priority`  | `-p`  | Update task priority (`low`, `medium`, `high`)   |
| `--status`    | `-s`  | Update task status (`todo`, `in-progress`, `done`)|
| `--dueDate`   |       | Update the due date (YYYY-MM-DD format)          |
| `--interactive`| `-i`  | Enter interactive mode to select fields to update |

*Note: If no update options are provided and `--interactive` is not used, interactive mode will be triggered automatically.*

### Usage Examples

```bash
# Update task status and priority using flags
task-stately update 123 --status in-progress --priority high

# Update task interactively (prompts which fields to update)
task-stately update 123 --interactive

# Update task (will trigger interactive mode as no update flags are given)
task-stately update 123
```

### Interactive Mode

If you use the `--interactive` flag or provide only the `<task-id>` without any update options, the CLI will prompt you to select which fields you want to update and then ask for the new values using `inquirer`.