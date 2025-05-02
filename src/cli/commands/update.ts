import { Command } from 'commander';
import { TaskManager } from '../../core/TaskManager';
import inquirer from 'inquirer'; // Import inquirer
import {
  TaskPriority,
  TaskPrioritySchema,
  TaskStatus,
  TaskStatusSchema,
  TaskTypeSchema,
  TaskType,
  // TaskTypeSchema, // Removed duplicate
  UpdateTaskData,
  TaskNotFoundError,
  Task,
} from '@/types/task';
// Removed incorrect import of parseTags, parseCriteria

// Extracted pure logic for updating a task
export async function updateTaskLogic(
  taskManager: TaskManager,
  id: string,
  options: {
    title?: string;
    description?: string;
    priority?: string;
    type?: string;
    status?: string;
    tags?: string[];
    criteria?: string[];
    assignee?: string;
  },
): Promise<Task> {
  const updateData: UpdateTaskData = {};
  let optionsProvided = false;

  // Use try...catch block for Zod parsing errors
  try {
    if (options.title !== undefined) {
      updateData.title = options.title;
      optionsProvided = true;
    }
    if (options.description !== undefined) {
      updateData.description = options.description;
      optionsProvided = true;
    }
    if (options.priority !== undefined) {
      updateData.priority = TaskPrioritySchema.parse(options.priority);
      optionsProvided = true;
    }
    if (options.type !== undefined) {
      updateData.type = TaskTypeSchema.parse(options.type);
      optionsProvided = true;
    }
    if (options.status !== undefined) {
      updateData.status = TaskStatusSchema.parse(options.status);
      optionsProvided = true;
    }
    if (options.tags !== undefined) {
      updateData.tags = options.tags;
      optionsProvided = true;
    }
    if (options.criteria !== undefined) {
      updateData.acceptanceCriteria = options.criteria;
      optionsProvided = true;
    }
    if (options.assignee !== undefined) {
      updateData.assignee = options.assignee;
      optionsProvided = true;
    }
  } catch (error: any) {
    // Re-throw Zod validation errors or other parsing errors
    if (error.errors) {
       const errorMessage = `Invalid input: ${error.errors
            .map((e: any) => `${e.path.join('.')} - ${e.message}`)
            .join(', ')}`;
       throw new Error(errorMessage);
    }
    throw error; // Re-throw other unexpected errors during parsing
  }


  // If no specific update options were provided via flags, it's an error unless interactive mode is intended.
  // The interactive mode handles fetching the task and prompting.
  // Non-interactive mode requires at least one update flag.
  // Note: This logic might be adjusted based on how interactive mode is triggered.
  // if (!optionsProvided) {
  //   throw new Error('No update options provided for non-interactive update.');
  // }

  // Let TaskManager handle TaskNotFoundError and other potential errors
  const updatedTask = await taskManager.updateTask(id, updateData);
  return updatedTask;
}

// Helper function to check if any update-specific options were provided
function hasUpdateOptions(options: any): boolean {
  const updateKeys: (keyof UpdateTaskData | 'criteria')[] = [
    'title',
    'description',
    'priority',
    'type',
    'status',
    'tags',
    'criteria', // Commander uses 'criteria', logic uses 'acceptanceCriteria'
    'assignee',
  ];
  return updateKeys.some(key => options[key] !== undefined);
}


export async function registerUpdateCommand(
  program: Command,
  taskManager: TaskManager,
) {
  program
    .command('update')
    .description('Update an existing task')
    .option('-i, --interactive', 'Update task interactively', true) // Add interactive flag
    .argument('<id>', 'ID of the task to update')
    .option('-t, --title <title>', 'New title for the task')
    .option('-d, --description <description>', 'New description for the task')
    .option(
      '-p, --priority <priority>',
      `New priority (${TaskPrioritySchema.options.join(', ')})`,
    )
    .option(
      '--type <type>',
      `New type (${TaskTypeSchema.options.join(', ')})`,
    )
    .option(
      '-s, --status <status>',
      `New status (${TaskStatusSchema.options.join(', ')})`,
    )
    .option('--tags <tags...>', 'Replace all existing tags with the provided ones (space-separated)')
    .option(
      '--criteria <criteria...>',
      'Replace all existing acceptance criteria with the provided ones (space-separated)',
    )
    .option('--assignee <assignee>', 'New assignee for the task')
    .action(async (id: string, options) => {
      const isInteractive = options.interactive || !hasUpdateOptions(options);

      try {
        let finalUpdateData: UpdateTaskData = {};

        if (isInteractive) {
          // --- Interactive Mode ---
          let existingTask: Task | undefined; // Allow undefined initially
          try {
            existingTask = await taskManager.getTask(id);
          } catch (err) {
            if (err instanceof TaskNotFoundError) {
              console.error(`Error: Task with ID "${id}" not found.`);
              process.exitCode = 1;
              return; // Exit if task not found
            }
            throw err; // Re-throw other errors
          }

          // Explicit check for undefined, although TaskNotFoundError should cover this
          if (!existingTask) {
             console.error(`Error: Task with ID "${id}" could not be retrieved.`);
             process.exitCode = 1;
             return;
          }


          const questions = [ // Removed incorrect type annotation
            {
              type: 'input',
              name: 'title',
              message: 'Task title:',
              default: existingTask.title,
            },
            {
              type: 'editor', // Use editor for multi-line
              name: 'description',
              message: 'Description (leave empty to keep current):',
              default: existingTask.description || '',
              // Note: inquirer's editor might not show default well, user needs to know
            },
            {
              type: 'list',
              name: 'priority',
              message: 'Priority:',
              choices: TaskPrioritySchema.options,
              default: existingTask.priority,
            },
            {
              type: 'list',
              name: 'type',
              message: 'Type:',
              choices: TaskTypeSchema.options,
              default: existingTask.type,
            },
            {
              type: 'list',
              name: 'status',
              message: 'Status:',
              choices: TaskStatusSchema.options,
              default: existingTask.status,
            },
            {
              type: 'input',
              name: 'tags',
              message: 'Tags (comma-separated, leave empty to keep current):',
              default: existingTask.tags?.join(', ') || '',
            },
            {
              type: 'input', // Using input for simplicity, could use editor
              name: 'criteria',
              message: 'Acceptance Criteria (comma-separated, leave empty to keep current):',
              default: existingTask.acceptanceCriteria?.join(', ') || '',
            },
            {
              type: 'input',
              name: 'assignee',
              message: 'Assignee (leave empty to keep current):',
              default: existingTask.assignee || '',
            },
          ];

          const answers = await inquirer.prompt(questions as any[]); // Re-added 'as any[]' cast

          // --- Process answers ---
          // Helper to parse comma-separated strings like in add.ts
          const parseCommaSeparated = (input: string | undefined): string[] =>
            input ? input.split(',').map(item => item.trim()).filter(Boolean) : [];

          // Build update data, including only fields that changed from the default
          finalUpdateData = {};
          if (answers.title !== existingTask.title) {
            finalUpdateData.title = answers.title;
          }
          if (answers.description !== (existingTask.description || '')) {
            // Ensure empty string from editor becomes undefined if original was undefined
            finalUpdateData.description = answers.description || undefined;
          }
          if (answers.priority !== existingTask.priority) {
            finalUpdateData.priority = answers.priority as TaskPriority;
          }
          if (answers.type !== existingTask.type) {
            finalUpdateData.type = answers.type as TaskType;
          }
          if (answers.status !== existingTask.status) {
            finalUpdateData.status = answers.status as TaskStatus;
          }
          // Compare parsed array with existing array
          const newTags = parseCommaSeparated(answers.tags);
          if (JSON.stringify(newTags) !== JSON.stringify(existingTask.tags || [])) {
             finalUpdateData.tags = newTags;
          }
          const newCriteria = parseCommaSeparated(answers.criteria);
           if (JSON.stringify(newCriteria) !== JSON.stringify(existingTask.acceptanceCriteria || [])) {
             finalUpdateData.acceptanceCriteria = newCriteria;
          }
          if (answers.assignee !== (existingTask.assignee || '')) {
             finalUpdateData.assignee = answers.assignee || undefined;
          }
          // --- End Process answers ---


           // If no changes were actually made in interactive mode
           if (Object.keys(finalUpdateData).length === 0) {
             console.log(`No changes detected for task "${existingTask.title}" (ID: ${id}).`);
             return;
           }

        } else {
          // --- Non-Interactive Mode ---
          // Directly use options passed, updateTaskLogic will validate
          finalUpdateData = {
            ...(options.title !== undefined && { title: options.title }),
            ...(options.description !== undefined && { description: options.description }),
            ...(options.priority !== undefined && { priority: options.priority as TaskPriority }),
            ...(options.type !== undefined && { type: options.type as TaskType }),
            ...(options.status !== undefined && { status: options.status as TaskStatus }),
            ...(options.tags !== undefined && { tags: options.tags }), // Commander handles array parsing
            ...(options.criteria !== undefined && { acceptanceCriteria: options.criteria }), // Commander handles array parsing
            ...(options.assignee !== undefined && { assignee: options.assignee }),
          };
           if (Object.keys(finalUpdateData).length === 0) {
             console.error('Error: No update options provided. Use --interactive or specify fields to update.');
             process.exitCode = 1;
             return;
           }
        }

        // Call the extracted logic function with the determined data
        const updatedTask = await updateTaskLogic(taskManager, id, finalUpdateData);

        // Use console.log for success message
        console.log(
          `✅ Task "${updatedTask.title}" (ID: ${updatedTask.id}) updated successfully.`,
        );

      } catch (error: any) {
        // Use console.error for error messages
        let errorMessage = '❌ Failed to update task.';
        if (error instanceof TaskNotFoundError) {
          errorMessage = `❌ Error: ${error.message}`;
        } else if (error instanceof Error) {
          // Catch Zod validation errors or other errors from updateTaskLogic/parsing
          errorMessage = `❌ Error: ${error.message}`;
        } else {
          errorMessage = `❌ An unexpected error occurred: ${String(error)}`;
        }
        console.error(errorMessage);
        process.exitCode = 1;
      }
    });
}