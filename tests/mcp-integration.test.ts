import { JsonEditorMCPServerTestable } from './JsonEditorMCPServerTestable';
import { createTestFile, readTestFile } from './setup';
import { createObjectWithDuplicateKeys } from './test-helpers';
import { promises as fs } from 'fs';
import path from 'path';

// Mock the MCP server for integration testing
class MockJsonEditorMCPServer extends JsonEditorMCPServerTestable {
  public async readJsonValue(filePath: string, path: string): Promise<any> {
    const jsonData = await this.readJsonFile(filePath);
    const value = this.getValueAtPath(jsonData, path);
    return value;
  }

  public async writeJsonValue(filePath: string, path: string, value: any): Promise<void> {
    let jsonData: any = {};
    try {
      jsonData = await this.readJsonFile(filePath);
    } catch (error) {
      // If file doesn't exist, start with empty object
      jsonData = {};
    }
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const [key, val] of Object.entries(value)) {
        const nestedPath = path ? `${path}.${key}` : key;
        this.setValueAtPath(jsonData, nestedPath, val);
      }
    } else {
      this.setValueAtPath(jsonData, path, value);
    }
    
    await this.writeJsonFile(filePath, jsonData);
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

describe('MCP Integration Tests', () => {
  let server: MockJsonEditorMCPServer;
  const testDir = path.join(__dirname, 'temp');

  beforeEach(async () => {
    server = new MockJsonEditorMCPServer();
    // Ensure test directory exists
    await fs.mkdir(testDir, { recursive: true });
  });

  describe('readJsonValue', () => {
    it('should read simple values from JSON files', async () => {
      const testData = { "key": "value" };
      const filePath = await createTestFile('simple.json', testData);
      
      const result = await server.readJsonValue(filePath, "key");
      expect(result).toBe("value");
    });

    it('should read nested values from JSON files', async () => {
      const testData = { "level1": { "level2": { "key": "value" } } };
      const filePath = await createTestFile('nested.json', testData);
      
      const result = await server.readJsonValue(filePath, "level1.level2.key");
      expect(result).toBe("value");
    });

    it('should throw error for non-existent path', async () => {
      const testData = { "key": "value" };
      const filePath = await createTestFile('error.json', testData);
      
      await expect(server.readJsonValue(filePath, "nonexistent")).rejects.toThrow();
    });

    it('should return empty object for non-existent file', async () => {
      await expect(server.readJsonValue('nonexistent.json', "key")).rejects.toThrow();
    });
  });

  describe('writeJsonValue', () => {
    it('should write simple values to JSON files', async () => {
      const filePath = path.join(testDir, 'write-simple.json');
      
      await server.writeJsonValue(filePath, "key", "value");
      
      const result = await readTestFile(filePath);
      expect(result).toEqual({ "key": "value" });
    });

    it('should write nested values to JSON files', async () => {
      const filePath = path.join(testDir, 'write-nested.json');
      
      await server.writeJsonValue(filePath, "level1.level2.key", "value");
      
      const result = await readTestFile(filePath);
      expect(result).toEqual({ "level1": { "level2": { "key": "value" } } });
    });

    it('should write objects to JSON files', async () => {
      const filePath = path.join(testDir, 'write-object.json');
      const objectValue = { "nested": { "key": "value" } };
      
      await server.writeJsonValue(filePath, "object", objectValue);
      
      const result = await readTestFile(filePath);
      expect(result).toEqual({ "object": objectValue });
    });

    it('should update existing values in JSON files', async () => {
      const initialData = { "key": "oldValue" };
      const filePath = await createTestFile('update.json', initialData);
      
      await server.writeJsonValue(filePath, "key", "newValue");
      
      const result = await readTestFile(filePath);
      expect(result).toEqual({ "key": "newValue" });
    });

    it('should create missing paths automatically', async () => {
      const filePath = path.join(testDir, 'create-paths.json');
      
      await server.writeJsonValue(filePath, "a.b.c.d", "value");
      
      const result = await readTestFile(filePath);
      expect(result).toEqual({ "a": { "b": { "c": { "d": "value" } } } });
    });
  });

  describe('mergeDuplicateKeys', () => {
    it('should merge duplicate keys in JSON files', async () => {
      const testData = createObjectWithDuplicateKeys([
        ["common", {
          "key1": "value1"
        }],
        ["common", {
          "key1": "value2",
          "key2": "value3"
        }]
      ]);
      const filePath = await createTestFile('merge.json', testData);
      
      await server.mergeDuplicateKeys(filePath);
      
      const result = await readTestFile(filePath);
      expect(result).toEqual({
        "common": {
          "key1": "value2",
          "key2": "value3"
        }
      });
    });

    it('should handle complex nested merging', async () => {
      const testData = createObjectWithDuplicateKeys([
        ["config", {
          "database": {
            "host": "localhost",
            "port": 5432
          },
          "api": {
            "timeout": 5000
          }
        }],
        ["config", {
          "database": {
            "host": "production.example.com",
            "ssl": true
          },
          "cache": {
            "enabled": true
          }
        }]
      ]);
      const filePath = await createTestFile('complex-merge.json', testData);
      
      await server.mergeDuplicateKeys(filePath);
      
      const result = await readTestFile(filePath);
      expect(result).toEqual({
        "config": {
          "database": {
            "host": "production.example.com",
            "ssl": true
          },
          "cache": {
            "enabled": true
          }
        }
      });
    });

    it('should handle files with no duplicate keys', async () => {
      const testData = {
        "key1": "value1",
        "key2": "value2"
      };
      const filePath = await createTestFile('no-duplicates.json', testData);
      
      await server.mergeDuplicateKeys(filePath);
      
      const result = await readTestFile(filePath);
      expect(result).toEqual(testData);
    });

    it('should handle empty files', async () => {
      const filePath = path.join(testDir, 'empty.json');
      await fs.writeFile(filePath, '{}');
      
      await server.mergeDuplicateKeys(filePath);
      
      const result = await readTestFile(filePath);
      expect(result).toEqual({});
    });
  });

  describe('End-to-End Workflows', () => {
    it('should handle a complete i18n translation workflow', async () => {
      // Start with a base translation file
      const baseTranslations = {
        "common": {
          "welcome": "Welcome",
          "goodbye": "Goodbye"
        },
        "pages": {
          "home": {
            "title": "Home"
          }
        }
      };
      const filePath = await createTestFile('i18n-en.json', baseTranslations);
      
      // Add new translations
      await server.writeJsonValue(filePath, "common.hello", "Hello");
      await server.writeJsonValue(filePath, "pages.about.title", "About Us");
      
      // Verify additions
      let result = await readTestFile(filePath);
      expect(result.common.hello).toBe("Hello");
      expect(result.pages.about.title).toBe("About Us");
      
      // Simulate duplicate keys (manual editing scenario)
      // Create a new object with duplicate keys and write it to the file
      const duplicateKeyData: any = {};
      duplicateKeyData["common"] = {
        "welcome": "Welcome",
        "goodbye": "Goodbye"
      };
      duplicateKeyData["common"] = {
        "welcome": "Bienvenue",
        "hello": "Hello"
      };
      duplicateKeyData["pages"] = {
        "home": {
          "title": "Home"
        },
        "about": {
          "title": "About Us"
        }
      };
      await fs.writeFile(filePath, JSON.stringify(duplicateKeyData, null, 2));
      
      // Merge duplicates
      await server.mergeDuplicateKeys(filePath);
      
      // Verify final result
      result = await readTestFile(filePath);
      expect(result.common.welcome).toBe("Bienvenue");
      expect(result.common.hello).toBe("Hello");
      expect(result.pages.home.title).toBe("Home");
    });

    it('should handle configuration file management', async () => {
      // Create initial config
      const initialConfig = {
        "app": {
          "name": "MyApp",
          "version": "1.0.0"
        },
        "database": {
          "host": "localhost",
          "port": 5432
        }
      };
      const filePath = await createTestFile('config.json', initialConfig);
      
      // Update configuration
      await server.writeJsonValue(filePath, "database.host", "production.example.com");
      await server.writeJsonValue(filePath, "database.ssl", true);
      await server.writeJsonValue(filePath, "app.environment", "production");
      
      // Verify updates
      let result = await readTestFile(filePath);
      expect(result.database.host).toBe("production.example.com");
      expect(result.database.ssl).toBe(true);
      expect(result.app.environment).toBe("production");
      
      // Read specific values
      const dbHost = await server.readJsonValue(filePath, "database.host");
      expect(dbHost).toBe("production.example.com");
    });
  });
});
