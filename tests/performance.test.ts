import { JsonEditorMCPServerTestable } from './JsonEditorMCPServerTestable';
import { createObjectWithDuplicateKeys } from './test-helpers';

describe('Performance and Stress Tests', () => {
  let server: JsonEditorMCPServerTestable;

  beforeEach(() => {
    server = new JsonEditorMCPServerTestable();
  });

  describe('Large Object Handling', () => {
    it('should handle objects with 10,000 keys', () => {
      const largeObj: any = {};
      for (let i = 0; i < 10000; i++) {
        largeObj[`key${i}`] = `value${i}`;
      }

      const input = createObjectWithDuplicateKeys([
        ['large', largeObj],
        ['large', { ...largeObj, 'extra': 'value' }]
      ]);

      const startTime = Date.now();
      const result = server.deepMergeDuplicates(input);
      const endTime = Date.now();

      expect(result.large).toBeDefined();
      expect(Object.keys(result.large)).toHaveLength(10001); // 10000 + 1 extra
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle deeply nested objects (100 levels)', () => {
      let deepObj: any = {};
      let current = deepObj;
      
      for (let i = 0; i < 100; i++) {
        current[`level${i}`] = {};
        current = current[`level${i}`];
      }
      current.value = 'deepValue';

      const input = createObjectWithDuplicateKeys([
        ['deep', deepObj],
        ['deep', { ...deepObj, 'level0': { ...deepObj.level0, 'extra': 'value' } }]
      ]);

      const startTime = Date.now();
      const result = server.deepMergeDuplicates(input);
      const endTime = Date.now();

      expect(result.deep).toBeDefined();
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });

    it('should handle many duplicate keys (1000 duplicates)', () => {
      const entries: Array<[string, any]> = [];
      
      for (let i = 0; i < 1000; i++) {
        entries.push([`key${i}`, `value${i}`]);
        entries.push([`key${i}`, `updatedValue${i}`]);
      }

      const input = createObjectWithDuplicateKeys(entries);

      const startTime = Date.now();
      const result = server.deepMergeDuplicates(input);
      const endTime = Date.now();

      expect(Object.keys(result)).toHaveLength(1000);
      for (let i = 0; i < 1000; i++) {
        expect(result[`key${i}`]).toBe(`updatedValue${i}`);
      }
      expect(endTime - startTime).toBeLessThan(200); // Should complete within 200ms
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory with repeated operations', () => {
      const baseMemory = process.memoryUsage().heapUsed;
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        const input = createObjectWithDuplicateKeys([
          ['key1', { 'nested': `value${i}` }],
          ['key1', { 'nested': `updated${i}`, 'extra': 'value' }]
        ]);
        
        const result = server.deepMergeDuplicates(input);
        expect(result).toBeDefined();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - baseMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle large arrays efficiently', () => {
      const largeArray = Array(10000).fill(0).map((_, i) => ({ id: i, value: `item${i}` }));
      
      const input = createObjectWithDuplicateKeys([
        ['array', largeArray],
        ['array', [...largeArray, { id: 10000, value: 'extra' }]]
      ]);

      const startTime = Date.now();
      const result = server.deepMergeDuplicates(input);
      const endTime = Date.now();

      expect(result.array).toHaveLength(10001);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe('Path Operations Performance', () => {
    it('should handle very long paths efficiently', () => {
      const obj: any = {};
      const longPath = Array(1000).fill('level').join('.');
      
      const startTime = Date.now();
      server.setValueAtPath(obj, longPath, 'deepValue');
      const setTime = Date.now();
      
      const value = server.getValueAtPath(obj, longPath);
      const getTime = Date.now();

      expect(value).toBe('deepValue');
      expect(setTime - startTime).toBeLessThan(50); // Set should be fast
      expect(getTime - setTime).toBeLessThan(50); // Get should be fast
    });

    it('should handle many path operations efficiently', () => {
      const obj: any = {};
      
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        server.setValueAtPath(obj, `level${i}.nested.value`, `value${i}`);
      }
      const endTime = Date.now();

      expect(Object.keys(obj)).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(200); // Should complete within 200ms
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple operations concurrently', async () => {
      const operations = Array(10).fill(0).map(async (_, i) => {
        const input = createObjectWithDuplicateKeys([
          ['key', `value${i}`],
          ['key', `updated${i}`]
        ]);
        return server.deepMergeDuplicates(input);
      });

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result.key).toBe(`updated${i}`);
      });
      expect(endTime - startTime).toBeLessThan(100); // All should complete within 100ms
    });
  });

  describe('Edge Case Performance', () => {
    it('should handle objects with many empty values efficiently', () => {
      const obj: any = {};
      for (let i = 0; i < 1000; i++) {
        obj[`key${i}`] = null;
      }

      const startTime = Date.now();
      const result = server.deepMergeDuplicates(obj);
      const endTime = Date.now();

      expect(result).toEqual(obj);
      expect(endTime - startTime).toBeLessThan(50); // Should be very fast
    });

    it('should handle objects with many undefined values efficiently', () => {
      const obj: any = {};
      for (let i = 0; i < 1000; i++) {
        obj[`key${i}`] = undefined;
      }

      const startTime = Date.now();
      const result = server.deepMergeDuplicates(obj);
      const endTime = Date.now();

      expect(result).toEqual(obj);
      expect(endTime - startTime).toBeLessThan(50); // Should be very fast
    });
  });
});

