import { JsonEditorMCPServerTestable } from './JsonEditorMCPServerTestable';
import { createTestFile, readTestFile } from './setup';
import { promises as fs } from 'fs';
import path from 'path';

describe('JSON Operations', () => {
  let server: JsonEditorMCPServerTestable;
  const testDir = path.join(__dirname, 'temp');

  beforeEach(() => {
    server = new JsonEditorMCPServerTestable();
  });

  describe('getValueAtPath', () => {
    it('should read simple values', () => {
      const obj = { "key": "value" };
      expect(server.getValueAtPath(obj, "key")).toBe("value");
    });

    it('should read nested values', () => {
      const obj = { "level1": { "level2": { "key": "value" } } };
      expect(server.getValueAtPath(obj, "level1.level2.key")).toBe("value");
    });

    it('should read array values', () => {
      const obj = { "array": [1, 2, 3] };
      expect(server.getValueAtPath(obj, "array")).toEqual([1, 2, 3]);
    });

    it('should read object values', () => {
      const obj = { "nested": { "key": "value" } };
      expect(server.getValueAtPath(obj, "nested")).toEqual({ "key": "value" });
    });

    it('should throw error for non-existent path', () => {
      const obj = { "key": "value" };
      expect(() => server.getValueAtPath(obj, "nonexistent")).toThrow("Path nonexistent not found: nonexistent does not exist");
    });

    it('should throw error for invalid path', () => {
      const obj = { "key": "value" };
      expect(() => server.getValueAtPath(obj, "key.nested")).toThrow("Path key.nested not found: nested is not an object");
    });

    it('should handle empty path', () => {
      const obj = { "key": "value" };
      expect(() => server.getValueAtPath(obj, "")).toThrow();
    });
  });

  describe('setValueAtPath', () => {
    it('should set simple values', () => {
      const obj: any = {};
      server.setValueAtPath(obj, "key", "value");
      expect(obj).toEqual({ "key": "value" });
    });

    it('should set nested values', () => {
      const obj: any = {};
      server.setValueAtPath(obj, "level1.level2.key", "value");
      expect(obj).toEqual({ "level1": { "level2": { "key": "value" } } });
    });

    it('should update existing values', () => {
      const obj: any = { "key": "oldValue" };
      server.setValueAtPath(obj, "key", "newValue");
      expect(obj).toEqual({ "key": "newValue" });
    });

    it('should update nested existing values', () => {
      const obj: any = { "level1": { "level2": { "key": "oldValue" } } };
      server.setValueAtPath(obj, "level1.level2.key", "newValue");
      expect(obj).toEqual({ "level1": { "level2": { "key": "newValue" } } });
    });

    it('should create intermediate objects', () => {
      const obj: any = {};
      server.setValueAtPath(obj, "a.b.c.d", "value");
      expect(obj).toEqual({ "a": { "b": { "c": { "d": "value" } } } });
    });

    it('should handle arrays', () => {
      const obj: any = {};
      server.setValueAtPath(obj, "array", [1, 2, 3]);
      expect(obj).toEqual({ "array": [1, 2, 3] });
    });

    it('should handle objects', () => {
      const obj: any = {};
      server.setValueAtPath(obj, "nested", { "key": "value" });
      expect(obj).toEqual({ "nested": { "key": "value" } });
    });

    it('should handle null and undefined values', () => {
      const obj: any = {};
      server.setValueAtPath(obj, "nullKey", null);
      server.setValueAtPath(obj, "undefinedKey", undefined);
      expect(obj).toEqual({ "nullKey": null, "undefinedKey": undefined });
    });

    it('should overwrite existing nested structures', () => {
      const obj: any = { "level1": { "level2": { "key": "value" } } };
      server.setValueAtPath(obj, "level1", "string");
      expect(obj).toEqual({ "level1": "string" });
    });
  });

  describe('readJsonFile', () => {
    it('should read valid JSON file', async () => {
      const testData = { "key": "value", "nested": { "key": "value" } };
      const filePath = await createTestFile('valid.json', testData);
      
      const result = await server.readJsonFile(filePath);
      expect(result).toEqual(testData);
    });

    it('should return empty object for non-existent file', async () => {
      const result = await server.readJsonFile('nonexistent.json');
      expect(result).toEqual({});
    });

    it('should throw error for invalid JSON', async () => {
      const filePath = path.join(testDir, 'invalid.json');
      await fs.writeFile(filePath, 'invalid json content');
      
      await expect(server.readJsonFile(filePath)).rejects.toThrow('Failed to read JSON file');
    });

    it('should handle empty file', async () => {
      const filePath = path.join(testDir, 'empty.json');
      await fs.writeFile(filePath, '');
      
      await expect(server.readJsonFile(filePath)).rejects.toThrow('Failed to read JSON file');
    });
  });

  describe('deleteValueAtPath', () => {
    it('should delete simple values', () => {
      const obj: any = { "key": "value", "other": "otherValue" };
      server.deleteValueAtPath(obj, "key");
      expect(obj).toEqual({ "other": "otherValue" });
      expect(obj.key).toBeUndefined();
    });

    it('should delete nested values', () => {
      const obj: any = {
        "level1": {
          "level2": {
            "key1": "value1",
            "key2": "value2"
          }
        }
      };
      server.deleteValueAtPath(obj, "level1.level2.key1");
      expect(obj.level1.level2).toEqual({ "key2": "value2" });
      expect(obj.level1.level2.key1).toBeUndefined();
    });

    it('should delete top-level keys', () => {
      const obj: any = { "key1": "value1", "key2": "value2", "key3": "value3" };
      server.deleteValueAtPath(obj, "key2");
      expect(obj).toEqual({ "key1": "value1", "key3": "value3" });
    });

    it('should throw error for non-existent path', () => {
      const obj: any = { "key": "value" };
      expect(() => server.deleteValueAtPath(obj, "nonexistent")).toThrow("Path nonexistent not found: nonexistent does not exist");
    });

    it('should throw error for non-existent nested path', () => {
      const obj: any = { "level1": { "level2": { "key": "value" } } };
      expect(() => server.deleteValueAtPath(obj, "level1.level2.nonexistent")).toThrow("Path level1.level2.nonexistent not found: nonexistent does not exist");
    });

    it('should throw error when trying to delete from non-object', () => {
      const obj: any = { "key": "value" };
      expect(() => server.deleteValueAtPath(obj, "key.nested")).toThrow("Path key.nested not found: cannot delete from non-object");
    });

    it('should handle deleting last key in nested object', () => {
      const obj: any = {
        "level1": {
          "level2": {
            "key": "value"
          }
        }
      };
      server.deleteValueAtPath(obj, "level1.level2.key");
      expect(obj.level1.level2).toEqual({});
    });
  });

  describe('Integration tests', () => {
    it('should handle complex nested operations', () => {
      const obj: any = {};
      
      // Set multiple nested values
      server.setValueAtPath(obj, "user.profile.name", "John Doe");
      server.setValueAtPath(obj, "user.profile.age", 30);
      server.setValueAtPath(obj, "user.settings.theme", "dark");
      server.setValueAtPath(obj, "user.settings.language", "en");
      
      // Verify the structure
      expect(obj).toEqual({
        "user": {
          "profile": {
            "name": "John Doe",
            "age": 30
          },
          "settings": {
            "theme": "dark",
            "language": "en"
          }
        }
      });
      
      // Read values back
      expect(server.getValueAtPath(obj, "user.profile.name")).toBe("John Doe");
      expect(server.getValueAtPath(obj, "user.profile.age")).toBe(30);
      expect(server.getValueAtPath(obj, "user.settings.theme")).toBe("dark");
      expect(server.getValueAtPath(obj, "user.settings.language")).toBe("en");
    });

    it('should handle array operations', () => {
      const obj: any = {};
      
      server.setValueAtPath(obj, "items", [1, 2, 3]);
      expect(server.getValueAtPath(obj, "items")).toEqual([1, 2, 3]);
      
      server.setValueAtPath(obj, "items", [4, 5, 6]);
      expect(server.getValueAtPath(obj, "items")).toEqual([4, 5, 6]);
    });

    it('should handle boolean and number values', () => {
      const obj: any = {};
      
      server.setValueAtPath(obj, "enabled", true);
      server.setValueAtPath(obj, "count", 42);
      server.setValueAtPath(obj, "price", 99.99);
      
      expect(server.getValueAtPath(obj, "enabled")).toBe(true);
      expect(server.getValueAtPath(obj, "count")).toBe(42);
      expect(server.getValueAtPath(obj, "price")).toBe(99.99);
    });
  });
});
