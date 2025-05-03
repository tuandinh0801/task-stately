#!/usr/bin/env node

import { program } from 'commander';
import { TaskManager } from '@/core/TaskManager'; // Use path alias
import { JsonFileTaskStorage } from '@/core/storage/JsonFileTaskStorage'; // Use path alias
import { registerInitCommand } from './commands/init'; // Import the init command
import { registerListCommand } from './commands/list'; // Import the list command
import { registerShowCommand } from './commands/show'; // Import the show command
import { registerAddCommand } from './commands/add'; // Import the add command
import { registerUpdateCommand } from './commands/update'; // Import the update command
import { registerDeleteCommand } from './commands/delete'; // Import the delete command
import { registerDependencyCommand } from './commands/dependency'; // Import the dependency command

const storage = new JsonFileTaskStorage(); // Using default path for now
const taskManager = new TaskManager(storage);

async function run() {
  program
    .name('task-stately')
    .description('CLI tool for managing tasks')
    .version('0.1.0');

  // Register commands
  registerInitCommand(program, taskManager);
  registerListCommand(program, taskManager); // Register the list command
  registerShowCommand(program, taskManager); // Register the show command
  registerAddCommand(program, taskManager); // Register the add command
  registerUpdateCommand(program, taskManager); // Register the update command
  registerDeleteCommand(program, taskManager); // Register the delete command
  registerDependencyCommand(program, taskManager); // Register the dependency command

  await program.parseAsync(process.argv);
}

run().catch((error: unknown) => {
  // Temporary error handling. Replace with Ink rendering later.
  // render(<ErrorDisplay error={error} />); // Example of future Ink rendering
  console.error('An error occurred:', error);
  process.exitCode = 1;
});
