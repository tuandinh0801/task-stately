# 4. User Guide

This guide covers the basic usage and command-line interface (CLI) functionalities of the Task Stately application.

## Listing Tasks (`list`)

The `list` command displays your tasks. Recent improvements allow for filtering and sorting.

### Basic Usage

To list all tasks:

```bash
task-stately list
```

### Filtering Tasks

You can filter tasks by their status:

- `--status <status>`: Filter by status (e.g., `pending`, `in-progress`, `completed`).

Example: List only pending tasks.
```bash
task-stately list --status pending
```

### Sorting Tasks

You can sort tasks by various fields:

- `--sort-by <field>`: Sort by field (e.g., `id`, `title`, `status`, `dueDate`).
- `--sort-order <order>`: Specify sort order (`asc` or `desc`, defaults to `asc`).

Example: List tasks sorted by due date in descending order.
```bash
task-stately list --sort-by dueDate --sort-order desc
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