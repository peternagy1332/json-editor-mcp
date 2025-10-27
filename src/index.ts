#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';

class JsonEditorMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'json-editor-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'read_json_value',
            description: 'Read a value from a JSON file at a specified path using dot notation',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the JSON file',
                },
                path: {
                  type: 'string',
                  description: 'Dot notation path to the value (e.g., "common.welcome")',
                },
              },
              required: ['filePath', 'path'],
            },
          },
          {
            name: 'write_json_value',
            description: 'Write a value to a JSON file at a specified path using dot notation. Creates missing paths automatically.',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the JSON file',
                },
                path: {
                  type: 'string',
                  description: 'Dot notation path to the value (e.g., "common.welcome")',
                },
                value: {
                  description: 'Value to write (any JSON-serializable type)',
                },
              },
              required: ['filePath', 'path', 'value'],
            },
          },
          {
            name: 'merge_duplicate_keys',
            description: 'Deep merge duplicate keys in a JSON file. Last value wins for primitives, objects merge recursively.',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the JSON file',
                },
              },
              required: ['filePath'],
            },
          },
          {
            name: 'read_multiple_json_values',
            description: 'Read values from multiple JSON files at a specified path using dot notation. Returns a map of file paths to values.',
            inputSchema: {
              type: 'object',
              properties: {
                filePaths: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of paths to JSON files',
                },
                path: {
                  type: 'string',
                  description: 'Dot notation path to the value (e.g., "common.welcome")',
                },
              },
              required: ['filePaths', 'path'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!args) {
        throw new Error('No arguments provided');
      }

      try {
        switch (name) {
          case 'read_json_value':
            return await this.readJsonValue(args.filePath as string, args.path as string);
          case 'write_json_value':
            return await this.writeJsonValue(args.filePath as string, args.path as string, args.value);
          case 'merge_duplicate_keys':
            return await this.mergeDuplicateKeys(args.filePath as string);
          case 'read_multiple_json_values':
            return await this.readMultipleJsonValues(args.filePaths as string[], args.path as string);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private async readJsonValue(filePath: string, path: string): Promise<CallToolResult> {
    const jsonData = await this.readJsonFile(filePath);
    const value = this.getValueAtPath(jsonData, path);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(value, null, 2),
        },
      ],
    };
  }

  private async writeJsonValue(filePath: string, path: string, value: any): Promise<CallToolResult> {
    let jsonData = await this.readJsonFile(filePath);
    
    // If value is an object, recursively set each key-value pair
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const results: string[] = [];
      
      for (const [key, val] of Object.entries(value)) {
        const nestedPath = path ? `${path}.${key}` : key;
        this.setValueAtPath(jsonData, nestedPath, val);
        results.push(`${nestedPath}: ${JSON.stringify(val)}`);
      }
      
      await this.writeJsonFile(filePath, jsonData);
      
      return {
        content: [
          {
            type: 'text',
            text: `Successfully wrote object to ${path} in ${filePath}:\n${results.join('\n')}`,
          },
        ],
      };
    }
    
    // For primitive values, set directly
    this.setValueAtPath(jsonData, path, value);
    await this.writeJsonFile(filePath, jsonData);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully wrote value to ${path} in ${filePath}`,
        },
      ],
    };
  }

  private async mergeDuplicateKeys(filePath: string): Promise<CallToolResult> {
    const jsonData = await this.readJsonFile(filePath);
    const mergedData = this.deepMergeDuplicates(jsonData);
    await this.writeJsonFile(filePath, mergedData);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully merged duplicate keys in ${filePath}`,
        },
      ],
    };
  }

  private async readMultipleJsonValues(filePaths: string[], path: string): Promise<CallToolResult> {
    const results: Record<string, any> = {};
    
    for (const filePath of filePaths) {
      try {
        const jsonData = await this.readJsonFile(filePath);
        const value = this.getValueAtPath(jsonData, path);
        results[filePath] = value;
      } catch (error) {
        results[filePath] = `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  private async readJsonFile(filePath: string): Promise<any> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return {};
      }
      throw new Error(`Failed to read JSON file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async writeJsonFile(filePath: string, data: any): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  private getValueAtPath(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        throw new Error(`Path ${path} not found: ${key} is not an object`);
      }
      if (!(key in current)) {
        throw new Error(`Path ${path} not found: ${key} does not exist`);
      }
      current = current[key];
    }
    
    return current;
  }

  private setValueAtPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  private deepMergeDuplicates(obj: any): any {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      return obj;
    }

    const result: any = {};
    const seenKeys = new Set<string>();

    for (const [key, value] of Object.entries(obj)) {
      if (seenKeys.has(key)) {
        // Merge with existing value
        const existingValue = result[key];
        if (typeof existingValue === 'object' && typeof value === 'object' && 
            existingValue !== null && value !== null && 
            !Array.isArray(existingValue) && !Array.isArray(value)) {
          result[key] = this.deepMerge(existingValue, value);
        } else {
          // Last value wins for primitives or incompatible types
          result[key] = this.deepMergeDuplicates(value);
        }
      } else {
        seenKeys.add(key);
        result[key] = this.deepMergeDuplicates(value);
      }
    }

    return result;
  }

  private deepMerge(target: any, source: any): any {
    if (source === null || typeof source !== 'object' || Array.isArray(source)) {
      return source;
    }

    if (target === null || typeof target !== 'object' || Array.isArray(target)) {
      return source;
    }

    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (key in result && typeof result[key] === 'object' && typeof value === 'object' && 
          result[key] !== null && value !== null && 
          !Array.isArray(result[key]) && !Array.isArray(value)) {
        result[key] = this.deepMerge(result[key], value);
      } else {
        result[key] = this.deepMergeDuplicates(value);
      }
    }

    return result;
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('JSON Editor MCP server running on stdio');
  }
}

// Start the server
const server = new JsonEditorMCPServer();
server.run().catch(console.error);
