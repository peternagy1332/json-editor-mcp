import { promises as fs } from 'fs';
import path from 'path';
import {
  assignOwnProperty,
  deleteValueAtPath as removeValueAtPath,
  getValueAtPath as readValueAtPath,
  setValueAtPath as writeValueAtPath,
} from '../src/json-path.js';

// Testable version of JsonEditorMCPServer that exposes private methods
// This version doesn't import the MCP SDK to avoid ESM issues in Jest
export class JsonEditorMCPServerTestable {
  public validateAbsolutePath(filePath: string): void {
    if (!path.isAbsolute(filePath)) {
      throw new Error(`Path must be absolute: ${filePath}`);
    }
  }
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
          assignOwnProperty(result, key, this.deepMerge(existingValue, value, visited));
        } else {
          // Last value wins for primitives or incompatible types
          assignOwnProperty(result, key, value);
        }
      } else {
        seenKeys.add(key);
        assignOwnProperty(result, key, this.deepMergeDuplicates(value, visited));
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
      const existing: unknown = Object.hasOwn(result, key) ? result[key] : undefined;
      if (typeof existing === 'object' && typeof value === 'object' &&
          existing !== null && value !== null &&
          !Array.isArray(existing) && !Array.isArray(value)) {
        assignOwnProperty(result, key, this.deepMerge(existing, value, visited));
      } else {
        assignOwnProperty(result, key, value);
      }
    }

    return result;
  }

  public getValueAtPath(obj: unknown, path: string): unknown {
    return readValueAtPath(obj, path);
  }

  public setValueAtPath(obj: unknown, path: string, value: unknown): void {
    writeValueAtPath(obj, path, value);
  }

  public deleteValueAtPath(obj: unknown, path: string): void {
    removeValueAtPath(obj, path);
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
    this.validateAbsolutePath(filePath);
    const jsonData = await this.readJsonFile(filePath);
    const mergedData = this.deepMergeDuplicates(jsonData);
    await this.writeJsonFile(filePath, mergedData);
  }

  public async writeJsonFile(filePath: string, data: any): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  public async readMultipleJsonValues(filePaths: string[], path: string): Promise<Record<string, any>> {
    for (const filePath of filePaths) {
      this.validateAbsolutePath(filePath);
    }
    
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
    
    return results;
  }

  private parsePythonDict(value: string): any {
    try {
      let jsonString = value.trim();
      
      if (!jsonString.startsWith('{') || !jsonString.endsWith('}')) {
        throw new Error('Not a Python dict');
      }
      
      jsonString = jsonString
        .replace(/'/g, '"')
        .replace(/True/g, 'true')
        .replace(/False/g, 'false')
        .replace(/None/g, 'null');
      
      return JSON.parse(jsonString);
    } catch {
      throw new Error('Failed to parse Python dict');
    }
  }

  public async writeMultipleJsonValues(filePaths: string[], path: string, value: any): Promise<Record<string, string>> {
    for (const filePath of filePaths) {
      this.validateAbsolutePath(filePath);
    }
    
    const results: Record<string, string> = {};
    
    let processedValue = value;
    
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
          processedValue = parsed;
        } else {
          processedValue = parsed;
        }
      } catch {
        try {
          processedValue = this.parsePythonDict(value);
        } catch {
          processedValue = value;
        }
      }
    }
    
    for (const filePath of filePaths) {
      try {
        let jsonData = await this.readJsonFile(filePath);
        
        if (processedValue !== null && typeof processedValue === 'object' && !Array.isArray(processedValue)) {
          const entries = Object.entries(processedValue);
          
          if (entries.length === 0) {
            this.setValueAtPath(jsonData, path, processedValue);
          } else {
            for (const [key, val] of entries) {
              const nestedPath = path ? `${path}.${key}` : key;
              this.setValueAtPath(jsonData, nestedPath, val);
            }
          }
        } else {
          this.setValueAtPath(jsonData, path, processedValue);
        }
        
        await this.writeJsonFile(filePath, jsonData);
        results[filePath] = 'Successfully wrote';
      } catch (error) {
        results[filePath] = `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    
    return results;
  }

  public async deleteMultipleJsonValues(filePaths: string[], path: string): Promise<Record<string, string>> {
    for (const filePath of filePaths) {
      this.validateAbsolutePath(filePath);
    }
    
    const results: Record<string, string> = {};
    
    for (const filePath of filePaths) {
      try {
        const jsonData = await this.readJsonFile(filePath);
        this.deleteValueAtPath(jsonData, path);
        await this.writeJsonFile(filePath, jsonData);
        results[filePath] = 'Successfully deleted';
      } catch (error) {
        results[filePath] = `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    
    return results;
  }
}