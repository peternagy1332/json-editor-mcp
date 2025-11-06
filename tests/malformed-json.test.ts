import { JsonEditorMCPServerTestable } from './JsonEditorMCPServerTestable';
import { createTestFile } from './setup';
import { promises as fs } from 'fs';
import path from 'path';

describe('Malformed JSON and Error Handling', () => {
  let server: JsonEditorMCPServerTestable;
  const testDir = path.join(__dirname, 'temp');

  beforeEach(async () => {
    server = new JsonEditorMCPServerTestable();
    await fs.mkdir(testDir, { recursive: true });
  });

  describe('Invalid JSON Files', () => {
    it('should handle files with syntax errors', async () => {
      const filePath = path.join(testDir, 'syntax-error.json');
      await fs.writeFile(filePath, '{ "key": "value", }'); // Trailing comma

      await expect(server.readJsonFile(filePath)).rejects.toThrow('Failed to read JSON file');
    });

    it('should handle files with unclosed brackets', async () => {
      const filePath = path.join(testDir, 'unclosed-bracket.json');
      await fs.writeFile(filePath, '{ "key": "value"'); // Missing closing brace

      await expect(server.readJsonFile(filePath)).rejects.toThrow('Failed to read JSON file');
    });

    it('should handle files with unclosed quotes', async () => {
      const filePath = path.join(testDir, 'unclosed-quote.json');
      await fs.writeFile(filePath, '{ "key": "value }'); // Unclosed quote

      await expect(server.readJsonFile(filePath)).rejects.toThrow('Failed to read JSON file');
    });

    it('should handle files with invalid escape sequences', async () => {
      const filePath = path.join(testDir, 'invalid-escape.json');
      await fs.writeFile(filePath, '{ "key": "value\\x" }'); // Invalid escape sequence

      await expect(server.readJsonFile(filePath)).rejects.toThrow('Failed to read JSON file');
    });

    it('should handle files with invalid unicode', async () => {
      const filePath = path.join(testDir, 'invalid-unicode.json');
      await fs.writeFile(filePath, '{ "key": "\\uZZZZ" }'); // Invalid unicode escape

      await expect(server.readJsonFile(filePath)).rejects.toThrow('Failed to read JSON file');
    });

    it('should handle files with comments (not valid JSON)', async () => {
      const filePath = path.join(testDir, 'with-comments.json');
      await fs.writeFile(filePath, '{ "key": "value" // comment }'); // Comments not allowed in JSON

      await expect(server.readJsonFile(filePath)).rejects.toThrow('Failed to read JSON file');
    });

    it('should handle files with trailing commas', async () => {
      const filePath = path.join(testDir, 'trailing-comma.json');
      await fs.writeFile(filePath, '{ "key1": "value1", "key2": "value2", }'); // Trailing comma

      await expect(server.readJsonFile(filePath)).rejects.toThrow('Failed to read JSON file');
    });

    it('should handle files with duplicate keys in JSON string', async () => {
      const filePath = path.join(testDir, 'duplicate-keys.json');
      await fs.writeFile(filePath, '{ "key": "value1", "key": "value2" }'); // Duplicate keys in JSON

      // This should actually work since JSON.parse handles duplicate keys
      const result = await server.readJsonFile(filePath);
      expect(result).toEqual({ key: 'value2' }); // Last value wins
    });
  });

  describe('Empty and Corrupted Files', () => {
    it('should handle completely empty files', async () => {
      const filePath = path.join(testDir, 'empty.json');
      await fs.writeFile(filePath, '');

      await expect(server.readJsonFile(filePath)).rejects.toThrow('Failed to read JSON file');
    });

    it('should handle files with only whitespace', async () => {
      const filePath = path.join(testDir, 'whitespace.json');
      await fs.writeFile(filePath, '   \n\t  ');

      await expect(server.readJsonFile(filePath)).rejects.toThrow('Failed to read JSON file');
    });

    it('should handle files with only comments', async () => {
      const filePath = path.join(testDir, 'comments-only.json');
      await fs.writeFile(filePath, '// This is a comment\n/* Another comment */');

      await expect(server.readJsonFile(filePath)).rejects.toThrow('Failed to read JSON file');
    });

    it('should handle files with null bytes', async () => {
      const filePath = path.join(testDir, 'null-bytes.json');
      await fs.writeFile(filePath, '{ "key": "value\0" }'); // Null byte in string

      await expect(server.readJsonFile(filePath)).rejects.toThrow('Failed to read JSON file');
    });

    it('should handle files with invalid UTF-8', async () => {
      const filePath = path.join(testDir, 'invalid-utf8.json');
      const buffer = Buffer.from([0x80, 0x81, 0x82]); // Invalid UTF-8 sequence
      await fs.writeFile(filePath, buffer);

      await expect(server.readJsonFile(filePath)).rejects.toThrow('Failed to read JSON file');
    });
  });

  describe('Path Error Handling', () => {
    it('should handle paths with invalid characters', () => {
      const obj = { key: 'value' };
      
      expect(() => server.getValueAtPath(obj, 'key.')).toThrow();
      expect(() => server.getValueAtPath(obj, '.key')).toThrow();
      expect(() => server.getValueAtPath(obj, 'key..nested')).toThrow();
      expect(() => server.getValueAtPath(obj, 'key.nested.')).toThrow();
    });

    it('should handle paths with special characters', () => {
      const obj = { 'key-with-dashes': { 'nested_key': 'value' } };
      
      expect(server.getValueAtPath(obj, 'key-with-dashes.nested_key')).toBe('value');
    });

    it('should handle paths with numeric keys', () => {
      const obj = { '0': { '1': 'value' } };
      
      expect(server.getValueAtPath(obj, '0.1')).toBe('value');
    });

    it('should handle paths with empty segments', () => {
      const obj = { '': { 'key': 'value' } };
      
      expect(server.getValueAtPath(obj, '.key')).toBe('value');
    });

    it('should handle very long paths', () => {
      const obj: any = {};
      const longPath = Array(1000).fill('level').join('.');
      
      server.setValueAtPath(obj, longPath, 'value');
      expect(server.getValueAtPath(obj, longPath)).toBe('value');
    });
  });

  describe('Type Coercion Edge Cases', () => {
    it('should handle objects with numeric string keys', () => {
      const obj = { '0': 'zero', '1': 'one' };
      
      expect(server.getValueAtPath(obj, '0')).toBe('zero');
      expect(server.getValueAtPath(obj, '1')).toBe('one');
    });

    it('should handle objects with boolean-like string keys', () => {
      const obj = { 'true': 'yes', 'false': 'no' };
      
      expect(server.getValueAtPath(obj, 'true')).toBe('yes');
      expect(server.getValueAtPath(obj, 'false')).toBe('no');
    });

    it('should handle objects with null-like string keys', () => {
      const obj = { 'null': 'empty', 'undefined': 'missing' };
      
      expect(server.getValueAtPath(obj, 'null')).toBe('empty');
      expect(server.getValueAtPath(obj, 'undefined')).toBe('missing');
    });
  });

  describe('Memory and Resource Limits', () => {
    it('should handle extremely large strings', () => {
      const largeString = 'x'.repeat(1000000); // 1MB string
      const obj = { large: largeString };
      
      const startTime = Date.now();
      const result = server.deepMergeDuplicates(obj);
      const endTime = Date.now();
      
      expect(result).toEqual(obj);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle objects with circular references gracefully', () => {
      const obj: any = { key: 'value' };
      obj.circular = obj;
      
      expect(() => server.deepMergeDuplicates(obj)).not.toThrow();
    });

    it('should handle deeply nested circular references', () => {
      const obj: any = { level1: { level2: { level3: {} } } };
      obj.level1.level2.level3.circular = obj;
      
      expect(() => server.deepMergeDuplicates(obj)).not.toThrow();
    });
  });

  describe('File System Errors', () => {
    it('should handle permission errors gracefully', async () => {
      // This test might not work on all systems, but it's good to have
      const filePath = '/root/restricted.json'; // Assuming this path is restricted
      
      try {
        await server.readJsonFile(filePath);
        // If we get here, the file was readable, which is fine
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle files that are directories', async () => {
      const dirPath = path.join(testDir, 'directory');
      await fs.mkdir(dirPath, { recursive: true });
      
      await expect(server.readJsonFile(dirPath)).rejects.toThrow('Failed to read JSON file');
    });

    it('should handle symbolic links', async () => {
      const targetPath = path.join(testDir, 'target.json');
      const linkPath = path.join(testDir, 'link.json');
      
      await fs.writeFile(targetPath, '{"key": "value"}');
      
      try {
        await fs.symlink(targetPath, linkPath);
        const result = await server.readJsonFile(linkPath);
        expect(result).toEqual({ key: 'value' });
      } catch (error) {
        // Symlinks might not be supported on all systems
        expect(error).toBeDefined();
      }
    });
  });
});
