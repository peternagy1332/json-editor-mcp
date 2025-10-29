import { promises as fs } from 'fs';
import path from 'path';

// Testable version of JsonEditorMCPServer that exposes private methods
// This version doesn't import the MCP SDK to avoid ESM issues in Jest
export class JsonEditorMCPServerTestable {
  // Expose private methods for testing
  public deepMergeDuplicates(obj: any, visited = new WeakSet()): any {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      return obj;
    }

    // Check for special object types (Date, RegExp, etc.)
    if (obj instanceof Date || obj instanceof RegExp || obj instanceof Function) {
      return obj;
    }

    // Check for circular references
    if (visited.has(obj)) {
      return obj; // Return the object as-is to avoid infinite recursion
    }
    visited.add(obj);

    const result: any = {};
    const seenKeys = new Set<string>();

    for (const [key, value] of Object.entries(obj)) {
      if (seenKeys.has(key)) {
        // Merge with existing value
        const existingValue = result[key];
        if (typeof existingValue === 'object' && typeof value === 'object' && 
            existingValue !== null && value !== null && 
            !Array.isArray(existingValue) && !Array.isArray(value)) {
          result[key] = this.deepMerge(existingValue, value, visited);
        } else {
          // Last value wins for primitives or incompatible types
          result[key] = value;
        }
      } else {
        seenKeys.add(key);
        result[key] = this.deepMergeDuplicates(value, visited);
      }
    }

    return result;
  }

  public deepMerge(target: any, source: any, visited = new WeakSet()): any {
    if (source === null || typeof source !== 'object' || Array.isArray(source)) {
      return source;
    }

    if (target === null || typeof target !== 'object' || Array.isArray(target)) {
      return source;
    }

    // Check for circular references
    if (visited.has(target) || visited.has(source)) {
      return source; // Return source to avoid infinite recursion
    }
    visited.add(target);
    visited.add(source);

    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (key in result && typeof result[key] === 'object' && typeof value === 'object' && 
          result[key] !== null && value !== null && 
          !Array.isArray(result[key]) && !Array.isArray(value)) {
        result[key] = this.deepMerge(result[key], value, visited);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  public getValueAtPath(obj: any, path: string): any {
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

  public setValueAtPath(obj: any, path: string, value: any): void {
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

  public async readJsonFile(filePath: string): Promise<any> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return {};
      }
      throw new Error(`Failed to read JSON file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async mergeDuplicateKeys(filePath: string): Promise<void> {
    const jsonData = await this.readJsonFile(filePath);
    const mergedData = this.deepMergeDuplicates(jsonData);
    await this.writeJsonFile(filePath, mergedData);
  }

  public async writeJsonFile(filePath: string, data: any): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }
}