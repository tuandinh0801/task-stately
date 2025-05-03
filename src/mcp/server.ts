import { FastMCP } from 'fastmcp';
// Removed Command import
// Keep for type usage in tools if needed, but not instantiated here
// Keep for type usage in tools if needed, but not instantiated here
// Removed z import if McpTool type comes from fastmcp

// Import tool factory functions
import { getTaskTool } from './tools/getTask';
import { listTasksTool } from './tools/listTasks';
import { addTaskTool } from './tools/addTask';
import { addMultipleTasksTool } from './tools/addMultipleTasks';
import { updateTaskTool } from './tools/updateTask';
import { deleteTaskTool } from './tools/deleteTask';
import { addTaskDependencyTool } from './tools/addTaskDependency';
import { removeTaskDependencyTool } from './tools/removeTaskDependency';
import { initTool } from './tools/init';

// --- Initialization ---

// Create MCP Server instance
// NOTE: TaskManager and StorageAdapter will be instantiated dynamically within each tool
//       using the 'projectRoot' parameter provided in the tool call.
const server = new FastMCP({
  name: 'task-stately-mcp',
  // description: 'MCP Server for Task Stately task management tool.', // Removed description
  version: '1.0.0', // Re-added required version property
});

// --- Tool Registration ---

// Register each tool factory/definition
server.addTool(listTasksTool());
server.addTool(getTaskTool());
server.addTool(addTaskTool());
server.addTool(addMultipleTasksTool());
server.addTool(updateTaskTool());
server.addTool(deleteTaskTool());
server.addTool(addTaskDependencyTool());
server.addTool(removeTaskDependencyTool());
server.addTool(initTool()); // Tool will handle storage instantiation

// --- Server Start ---

// Function to start the server (e.g., called from an executable script)
async function startServer() {
  try {
    // Removed explicit storage initialization
    await server.start({ transportType: 'stdio' });
    console.log('Task Stately MCP Server started on stdio.');
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Start the server if this script is run directly
startServer()
  .then(() => {
    console.log('Server started successfully.');
  })
  .catch((error: unknown) => {
    console.error('Error starting server:', error);
  });
