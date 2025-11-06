import { JsonEditorMCPServerTestable } from './JsonEditorMCPServerTestable';
import { createTestFile } from './setup';
import { createObjectWithDuplicateKeys } from './test-helpers';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('Absolute Path Validation', () => {
  let server: JsonEditorMCPServerTestable;
  const testDir = path.join(__dirname, 'temp');

  beforeEach(() => {
    server = new JsonEditorMCPServerTestable();
  });

  describe('validateAbsolutePath', () => {
    it('should accept absolute paths on Unix systems', () => {
      expect(() => server.validateAbsolutePath('/absolute/path/to/file.json')).not.toThrow();
    });

    it('should accept absolute paths on Windows systems', () => {
      if (os.platform() === 'win32') {
        expect(() => server.validateAbsolutePath('C:\\absolute\\path\\to\\file.json')).not.toThrow();
      } else {
        // Skip on non-Windows platforms since path.isAbsolute is platform-specific
        expect(true).toBe(true);
      }
    });

    it('should reject relative paths', () => {
      expect(() => server.validateAbsolutePath('relative/path.json')).toThrow('Path must be absolute: relative/path.json');
    });

    it('should reject paths starting with dot', () => {
      expect(() => server.validateAbsolutePath('./relative/path.json')).toThrow('Path must be absolute: ./relative/path.json');
      expect(() => server.validateAbsolutePath('../relative/path.json')).toThrow('Path must be absolute: ../relative/path.json');
    });

    it('should reject paths without leading slash or drive letter', () => {
      expect(() => server.validateAbsolutePath('file.json')).toThrow('Path must be absolute: file.json');
    });
  });

  describe('mergeDuplicateKeys', () => {
    it('should throw error for relative path', async () => {
      await expect(server.mergeDuplicateKeys('relative/path.json')).rejects.toThrow('Path must be absolute: relative/path.json');
    });

    it('should work with absolute path', async () => {
      const testData = createObjectWithDuplicateKeys([
        ["key", "value"],
        ["key", "duplicate"]
      ]);
      const filePath = await createTestFile('merge-test.json', testData);
      
      await expect(server.mergeDuplicateKeys(filePath)).resolves.not.toThrow();
    });
  });

  describe('readMultipleJsonValues', () => {
    it('should throw error when any path is relative', async () => {
      const testData = { "key": "value" };
      const absolutePath = await createTestFile('read-test.json', testData);
      
      await expect(
        server.readMultipleJsonValues([absolutePath, 'relative/path.json'], 'key')
      ).rejects.toThrow('Path must be absolute: relative/path.json');
    });

    it('should throw error when all paths are relative', async () => {
      await expect(
        server.readMultipleJsonValues(['relative1.json', 'relative2.json'], 'key')
      ).rejects.toThrow('Path must be absolute: relative1.json');
    });

    it('should work with all absolute paths', async () => {
      const testData = { "key": "value" };
      const filePath = await createTestFile('read-test.json', testData);
      
      const result = await server.readMultipleJsonValues([filePath], 'key');
      expect(result[filePath]).toBe('value');
    });
  });

  describe('writeMultipleJsonValues', () => {
    it('should throw error when any path is relative', async () => {
      const absolutePath = path.join(testDir, 'write-test.json');
      
      await expect(
        server.writeMultipleJsonValues([absolutePath, 'relative/path.json'], 'key', 'value')
      ).rejects.toThrow('Path must be absolute: relative/path.json');
    });

    it('should throw error when all paths are relative', async () => {
      await expect(
        server.writeMultipleJsonValues(['relative1.json', 'relative2.json'], 'key', 'value')
      ).rejects.toThrow('Path must be absolute: relative1.json');
    });

    it('should work with all absolute paths', async () => {
      const filePath = path.join(testDir, 'write-test.json');
      
      const result = await server.writeMultipleJsonValues([filePath], 'key', 'value');
      expect(result[filePath]).toBe('Successfully wrote');
      
      const content = await fs.readFile(filePath, 'utf-8');
      expect(JSON.parse(content)).toEqual({ "key": "value" });
    });
  });

  describe('deleteMultipleJsonValues', () => {
    it('should throw error when any path is relative', async () => {
      const testData = { "key": "value" };
      const absolutePath = await createTestFile('delete-test.json', testData);
      
      await expect(
        server.deleteMultipleJsonValues([absolutePath, 'relative/path.json'], 'key')
      ).rejects.toThrow('Path must be absolute: relative/path.json');
    });

    it('should throw error when all paths are relative', async () => {
      await expect(
        server.deleteMultipleJsonValues(['relative1.json', 'relative2.json'], 'key')
      ).rejects.toThrow('Path must be absolute: relative1.json');
    });

    it('should work with all absolute paths', async () => {
      const testData = { "key": "value", "other": "keep" };
      const filePath = await createTestFile('delete-test.json', testData);
      
      const result = await server.deleteMultipleJsonValues([filePath], 'key');
      expect(result[filePath]).toBe('Successfully deleted');
      
      const content = await fs.readFile(filePath, 'utf-8');
      expect(JSON.parse(content)).toEqual({ "other": "keep" });
    });
  });
});

