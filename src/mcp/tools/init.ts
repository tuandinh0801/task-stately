import { z } from 'zod';
import { JsonFileTaskStorage } from '../../core/storage/JsonFileTaskStorage';
// Import Context along with Tool
import { Tool, Context, TextContent, ContentResult } from 'fastmcp';

// Define input schema - now requires projectRoot
const InitParamsSchema = z.object({
  projectRoot: z
    .string()
    .describe('Absolute path to the project root directory on the client.'),
});

// Define the inferred type for params
type InitParams = z.infer<typeof InitParamsSchema>;

/**
 * Factory function to create the init tool.
 * This follows the new pattern where storage adapter is instantiated dynamically
 * within the execute function using the projectRoot parameter
 * @returns The MCP tool definition.
 */
export const initTool = (): Tool<any, typeof InitParamsSchema> => ({
  name: 'init',
  description:
    'Initializes the task storage (e.g., creates tasks.json if it does not exist).',
  parameters: InitParamsSchema, // Correct property name based on spec examples

  // Ensure execute function is defined
  // Update return type to match MCP standard ToolResult structure
  execute: async (args: InitParams): Promise<ContentResult> => {
    // Args are validated by FastMCP based on inputSchema
    const { projectRoot } = args;

    try {
      // Instantiate storage adapter dynamically for this request
      // Pass projectRoot as the first argument, let fileName default
      const storageAdapter = new JsonFileTaskStorage(projectRoot);

      // Ensure storageAdapter.initialize is called, checking if it exists first
      // Assuming initialize() creates the file/structure if needed and is idempotent
      if (storageAdapter.initialize) {
        await storageAdapter.initialize();
      }

      // Return the standard MCP tool result structure
      return {
        isError: false,
        content: [
          {
            type: 'text',
            text: 'Task storage initialized successfully (or already exists).',
          },
        ],
      };
    } catch (error: unknown) {
      // Handle errors during storage initialization
      console.error('Error in init tool:', error);
      // Throwing an error is standard practice for MCP tools on failure
      if (error instanceof Error) {
        throw new Error(`Storage initialization failed: ${error.message}`);
      } else {
        throw new Error(
          'An unknown error occurred during storage initialization.'
        );
      }
    }
  },
});
