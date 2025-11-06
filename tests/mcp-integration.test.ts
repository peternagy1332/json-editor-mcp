import { JsonEditorMCPServerTestable } from './JsonEditorMCPServerTestable';
import { createTestFile, readTestFile } from './setup';
import { createObjectWithDuplicateKeys } from './test-helpers';
import { promises as fs } from 'fs';
import path from 'path';

// Mock the MCP server for integration testing
class MockJsonEditorMCPServer extends JsonEditorMCPServerTestable {
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

  describe('readMultipleJsonValues', () => {
    it('should read simple values from JSON files', async () => {
      const testData = { "key": "value" };
      const filePath = await createTestFile('simple.json', testData);
      
      const result = await server.readMultipleJsonValues([filePath], "key");
      expect(result[filePath]).toBe("value");
    });

    it('should read nested values from JSON files', async () => {
      const testData = { "level1": { "level2": { "key": "value" } } };
      const filePath = await createTestFile('nested.json', testData);
      
      const result = await server.readMultipleJsonValues([filePath], "level1.level2.key");
      expect(result[filePath]).toBe("value");
    });

    it('should handle error for non-existent path', async () => {
      const testData = { "key": "value" };
      const filePath = await createTestFile('error.json', testData);
      
      const result = await server.readMultipleJsonValues([filePath], "nonexistent");
      expect(result[filePath]).toContain("Error");
    });

    it('should handle non-existent file', async () => {
      const nonexistentPath = path.join(testDir, 'nonexistent.json');
      const result = await server.readMultipleJsonValues([nonexistentPath], "key");
      expect(result[nonexistentPath]).toContain("Error");
    });
  });

  describe('writeMultipleJsonValues', () => {
    it('should write simple values to JSON files', async () => {
      const filePath = path.join(testDir, 'write-simple.json');
      
      const result = await server.writeMultipleJsonValues([filePath], "key", "value");
      expect(result[filePath]).toBe("Successfully wrote");
      
      const fileContent = await readTestFile(filePath);
      expect(fileContent).toEqual({ "key": "value" });
    });

    it('should write nested values to JSON files', async () => {
      const filePath = path.join(testDir, 'write-nested.json');
      
      const result = await server.writeMultipleJsonValues([filePath], "level1.level2.key", "value");
      expect(result[filePath]).toBe("Successfully wrote");
      
      const fileContent = await readTestFile(filePath);
      expect(fileContent).toEqual({ "level1": { "level2": { "key": "value" } } });
    });

    it('should write objects to JSON files', async () => {
      const filePath = path.join(testDir, 'write-object.json');
      const objectValue = { "nested": { "key": "value" } };
      
      const result = await server.writeMultipleJsonValues([filePath], "object", objectValue);
      expect(result[filePath]).toBe("Successfully wrote");
      
      const fileContent = await readTestFile(filePath);
      expect(fileContent).toEqual({ "object": objectValue });
    });

    it('should write deeply nested objects correctly', async () => {
      const filePath = path.join(testDir, 'write-deeply-nested.json');
      const nestedValue = {
        "level1": {
          "level2": {
            "level3": {
              "key": "value",
              "other": "data"
            }
          }
        }
      };
      
      const result = await server.writeMultipleJsonValues([filePath], "data", nestedValue);
      expect(result[filePath]).toBe("Successfully wrote");
      
      const fileContent = await readTestFile(filePath);
      expect(fileContent).toEqual({ "data": nestedValue });
      expect(fileContent.data.level1.level2.level3.key).toBe("value");
      expect(fileContent.data.level1.level2.level3.other).toBe("data");
    });

    it('should update existing values in JSON files', async () => {
      const initialData = { "key": "oldValue" };
      const filePath = await createTestFile('update.json', initialData);
      
      const result = await server.writeMultipleJsonValues([filePath], "key", "newValue");
      expect(result[filePath]).toBe("Successfully wrote");
      
      const fileContent = await readTestFile(filePath);
      expect(fileContent).toEqual({ "key": "newValue" });
    });

    it('should create missing paths automatically', async () => {
      const filePath = path.join(testDir, 'create-paths.json');
      
      const result = await server.writeMultipleJsonValues([filePath], "a.b.c.d", "value");
      expect(result[filePath]).toBe("Successfully wrote");
      
      const fileContent = await readTestFile(filePath);
      expect(fileContent).toEqual({ "a": { "b": { "c": { "d": "value" } } } });
    });

    it('should parse JSON string and insert as nested object', async () => {
      const filePath = path.join(testDir, 'json-string-object.json');
      
      const result = await server.writeMultipleJsonValues([filePath], "test", '{"key": "value", "nested": {"foo": "bar"}}');
      expect(result[filePath]).toBe("Successfully wrote");
      
      const fileContent = await readTestFile(filePath);
      expect(fileContent).toEqual({
        "test": {
          "key": "value",
          "nested": {
            "foo": "bar"
          }
        }
      });
    });

    it('should parse JSON string and recursively create nested paths', async () => {
      const filePath = path.join(testDir, 'json-string-nested.json');
      
      const result = await server.writeMultipleJsonValues([filePath], "level1.level2", '{"key1": "value1", "key2": "value2"}');
      expect(result[filePath]).toBe("Successfully wrote");
      
      const fileContent = await readTestFile(filePath);
      expect(fileContent).toEqual({
        "level1": {
          "level2": {
            "key1": "value1",
            "key2": "value2"
          }
        }
      });
    });

    it('should treat invalid JSON string as string primitive', async () => {
      const filePath = path.join(testDir, 'invalid-json-string.json');
      
      const result = await server.writeMultipleJsonValues([filePath], "key", "not valid json {");
      expect(result[filePath]).toBe("Successfully wrote");
      
      const fileContent = await readTestFile(filePath);
      expect(fileContent).toEqual({ "key": "not valid json {" });
    });

    it('should parse JSON string with primitive value', async () => {
      const filePath = path.join(testDir, 'json-string-primitive.json');
      
      await server.writeMultipleJsonValues([filePath], "number", "123");
      await server.writeMultipleJsonValues([filePath], "boolean", "true");
      await server.writeMultipleJsonValues([filePath], "nullValue", "null");
      
      const fileContent = await readTestFile(filePath);
      expect(fileContent).toEqual({
        "number": 123,
        "boolean": true,
        "nullValue": null
      });
    });

    it('should parse JSON string with array', async () => {
      const filePath = path.join(testDir, 'json-string-array.json');
      
      const result = await server.writeMultipleJsonValues([filePath], "items", '[1, 2, 3, "four"]');
      expect(result[filePath]).toBe("Successfully wrote");
      
      const fileContent = await readTestFile(filePath);
      expect(fileContent).toEqual({
        "items": [1, 2, 3, "four"]
      });
    });

    it('should handle regular string primitive (not JSON)', async () => {
      const filePath = path.join(testDir, 'regular-string.json');
      
      const result = await server.writeMultipleJsonValues([filePath], "message", "Hello, world!");
      expect(result[filePath]).toBe("Successfully wrote");
      
      const fileContent = await readTestFile(filePath);
      expect(fileContent).toEqual({ "message": "Hello, world!" });
    });

    it('should handle empty JSON object string', async () => {
      const filePath = path.join(testDir, 'empty-json-object.json');
      
      const result = await server.writeMultipleJsonValues([filePath], "empty", "{}");
      expect(result[filePath]).toBe("Successfully wrote");
      
      const fileContent = await readTestFile(filePath);
      expect(fileContent).toEqual({ "empty": {} });
    });

    it('should write to multiple files', async () => {
      const filePath1 = path.join(testDir, 'multi-write1.json');
      const filePath2 = path.join(testDir, 'multi-write2.json');
      
      const result = await server.writeMultipleJsonValues([filePath1, filePath2], "key", "value");
      expect(result[filePath1]).toBe("Successfully wrote");
      expect(result[filePath2]).toBe("Successfully wrote");
      
      const fileContent1 = await readTestFile(filePath1);
      const fileContent2 = await readTestFile(filePath2);
      expect(fileContent1).toEqual({ "key": "value" });
      expect(fileContent2).toEqual({ "key": "value" });
    });

    it('should parse Python dict syntax', async () => {
      const filePath = path.join(testDir, 'python-dict.json');
      
      const result = await server.writeMultipleJsonValues([filePath], "metadata", "{'title': 'Your Friends', 'description': 'A list of your friends'}");
      expect(result[filePath]).toBe("Successfully wrote");
      
      const fileContent = await readTestFile(filePath);
      expect(fileContent).toEqual({
        "metadata": {
          "title": "Your Friends",
          "description": "A list of your friends"
        }
      });
    });

    it('should parse Python dict with boolean and null values', async () => {
      const filePath = path.join(testDir, 'python-dict-boolean.json');
      
      const result = await server.writeMultipleJsonValues([filePath], "config", "{'enabled': True, 'debug': False, 'value': None}");
      expect(result[filePath]).toBe("Successfully wrote");
      
      const fileContent = await readTestFile(filePath);
      expect(fileContent).toEqual({
        "config": {
          "enabled": true,
          "debug": false,
          "value": null
        }
      });
    });

    it('should handle Python dict with nested structures', async () => {
      const filePath = path.join(testDir, 'python-dict-nested.json');
      
      const result = await server.writeMultipleJsonValues([filePath], "data", "{'user': {'name': 'John', 'age': 30}, 'active': True}");
      expect(result[filePath]).toBe("Successfully wrote");
      
      const fileContent = await readTestFile(filePath);
      expect(fileContent).toEqual({
        "data": {
          "user": {
            "name": "John",
            "age": 30
          },
          "active": true
        }
      });
    });

    it('should handle deeply nested Python dict structures', async () => {
      const filePath = path.join(testDir, 'python-dict-deeply-nested.json');
      
      const result = await server.writeMultipleJsonValues([filePath], "metadata", "{'level1': {'level2': {'level3': {'key': 'value', 'other': 'data'}}}}");
      expect(result[filePath]).toBe("Successfully wrote");
      
      const fileContent = await readTestFile(filePath);
      expect(fileContent).toEqual({
        "metadata": {
          "level1": {
            "level2": {
              "level3": {
                "key": "value",
                "other": "data"
              }
            }
          }
        }
      });
      expect(fileContent.metadata.level1.level2.level3.key).toBe("value");
      expect(fileContent.metadata.level1.level2.level3.other).toBe("data");
    });

    it('should preserve nested object structure when writing directly', async () => {
      const filePath = path.join(testDir, 'nested-object-direct.json');
      const nestedObject = {
        "title": "Your Friends",
        "description": "A list of your friends",
        "metadata": {
          "created": "2024-01-01",
          "author": {
            "name": "John",
            "email": "john@example.com"
          }
        }
      };
      
      const result = await server.writeMultipleJsonValues([filePath], "page", nestedObject);
      expect(result[filePath]).toBe("Successfully wrote");
      
      const fileContent = await readTestFile(filePath);
      expect(fileContent).toEqual({
        "page": nestedObject
      });
      expect(fileContent.page.metadata.author.name).toBe("John");
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

  describe('deleteMultipleJsonValues', () => {
    it('should delete a value from multiple JSON files', async () => {
      const testData1 = {
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
      const testData2 = {
        "common": {
          "welcome": "Bienvenue",
          "goodbye": "Au revoir"
        },
        "pages": {
          "home": {
            "title": "Accueil"
          }
        }
      };
      
      const filePath1 = await createTestFile('delete-test1.json', testData1);
      const filePath2 = await createTestFile('delete-test2.json', testData2);
      
      const results = await server.deleteMultipleJsonValues([filePath1, filePath2], "common.goodbye");
      
      expect(results[filePath1]).toBe("Successfully deleted");
      expect(results[filePath2]).toBe("Successfully deleted");
      
      const result1 = await readTestFile(filePath1);
      const result2 = await readTestFile(filePath2);
      
      expect(result1.common).toEqual({ "welcome": "Welcome" });
      expect(result2.common).toEqual({ "welcome": "Bienvenue" });
      expect(result1.common.goodbye).toBeUndefined();
      expect(result2.common.goodbye).toBeUndefined();
    });

    it('should delete nested values from multiple JSON files', async () => {
      const testData1 = {
        "level1": {
          "level2": {
            "key1": "value1",
            "key2": "value2"
          }
        }
      };
      const testData2 = {
        "level1": {
          "level2": {
            "key1": "value3",
            "key2": "value4"
          }
        }
      };
      
      const filePath1 = await createTestFile('delete-nested1.json', testData1);
      const filePath2 = await createTestFile('delete-nested2.json', testData2);
      
      const results = await server.deleteMultipleJsonValues([filePath1, filePath2], "level1.level2.key1");
      
      expect(results[filePath1]).toBe("Successfully deleted");
      expect(results[filePath2]).toBe("Successfully deleted");
      
      const result1 = await readTestFile(filePath1);
      const result2 = await readTestFile(filePath2);
      
      expect(result1.level1.level2).toEqual({ "key2": "value2" });
      expect(result2.level1.level2).toEqual({ "key2": "value4" });
    });

    it('should handle errors gracefully when path does not exist in some files', async () => {
      const testData1 = {
        "common": {
          "welcome": "Welcome"
        }
      };
      const testData2 = {
        "common": {
          "welcome": "Bienvenue",
          "goodbye": "Au revoir"
        }
      };
      
      const filePath1 = await createTestFile('delete-error1.json', testData1);
      const filePath2 = await createTestFile('delete-error2.json', testData2);
      
      const results = await server.deleteMultipleJsonValues([filePath1, filePath2], "common.goodbye");
      
      expect(results[filePath1]).toContain("Error");
      expect(results[filePath2]).toBe("Successfully deleted");
      
      const result1 = await readTestFile(filePath1);
      const result2 = await readTestFile(filePath2);
      
      expect(result1.common).toEqual({ "welcome": "Welcome" });
      expect(result2.common).toEqual({ "welcome": "Bienvenue" });
    });

    it('should handle non-existent files gracefully', async () => {
      const testData = {
        "common": {
          "welcome": "Welcome",
          "goodbye": "Goodbye"
        }
      };
      
      const filePath1 = await createTestFile('delete-existing.json', testData);
      const filePath2 = path.join(testDir, 'delete-nonexistent.json');
      
      const results = await server.deleteMultipleJsonValues([filePath1, filePath2], "common.goodbye");
      
      expect(results[filePath1]).toBe("Successfully deleted");
      expect(results[filePath2]).toContain("Error");
      
      const result1 = await readTestFile(filePath1);
      expect(result1.common).toEqual({ "welcome": "Welcome" });
    });

    it('should delete top-level keys from multiple files', async () => {
      const testData1 = {
        "key1": "value1",
        "key2": "value2",
        "key3": "value3"
      };
      const testData2 = {
        "key1": "value4",
        "key2": "value5",
        "key3": "value6"
      };
      
      const filePath1 = await createTestFile('delete-top1.json', testData1);
      const filePath2 = await createTestFile('delete-top2.json', testData2);
      
      const results = await server.deleteMultipleJsonValues([filePath1, filePath2], "key2");
      
      expect(results[filePath1]).toBe("Successfully deleted");
      expect(results[filePath2]).toBe("Successfully deleted");
      
      const result1 = await readTestFile(filePath1);
      const result2 = await readTestFile(filePath2);
      
      expect(result1).toEqual({
        "key1": "value1",
        "key3": "value3"
      });
      expect(result2).toEqual({
        "key1": "value4",
        "key3": "value6"
      });
    });

    it('should handle empty file paths array', async () => {
      const results = await server.deleteMultipleJsonValues([], "common.welcome");
      
      expect(results).toEqual({});
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
      await server.writeMultipleJsonValues([filePath], "common.hello", "Hello");
      await server.writeMultipleJsonValues([filePath], "pages.about.title", "About Us");
      
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
      await server.writeMultipleJsonValues([filePath], "database.host", "production.example.com");
      await server.writeMultipleJsonValues([filePath], "database.ssl", true);
      await server.writeMultipleJsonValues([filePath], "app.environment", "production");
      
      // Verify updates
      let result = await readTestFile(filePath);
      expect(result.database.host).toBe("production.example.com");
      expect(result.database.ssl).toBe(true);
      expect(result.app.environment).toBe("production");
      
      // Read specific values
      const readResult = await server.readMultipleJsonValues([filePath], "database.host");
      expect(readResult[filePath]).toBe("production.example.com");
    });
  });
});
