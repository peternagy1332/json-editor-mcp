import { JsonEditorMCPServerTestable } from './JsonEditorMCPServerTestable';
import { createTestFile, readTestFile } from './setup';
import { createObjectWithDuplicateKeys } from './test-helpers';
import { promises as fs } from 'fs';
import path from 'path';

describe('Large File Handling', () => {
  let server: JsonEditorMCPServerTestable;
  const testDir = path.join(__dirname, 'temp');

  beforeEach(async () => {
    server = new JsonEditorMCPServerTestable();
    await fs.mkdir(testDir, { recursive: true });
  });

  describe('Large JSON Objects', () => {
    it('should handle objects with 100,000 keys', () => {
      const largeObj: any = {};
      for (let i = 0; i < 100000; i++) {
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
      expect(Object.keys(result.large)).toHaveLength(100001); // 100000 + 1 extra
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle deeply nested objects (50 levels)', () => {
      let deepObj: any = {};
      let current = deepObj;
      
      for (let i = 0; i < 50; i++) {
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
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle objects with large arrays', () => {
      const largeArray = Array(50000).fill(0).map((_, i) => ({
        id: i,
        name: `Item ${i}`,
        data: `Data for item ${i}`,
        metadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          tags: [`tag${i % 10}`, `category${i % 5}`]
        }
      }));

      const input = createObjectWithDuplicateKeys([
        ['items', largeArray],
        ['items', [...largeArray, { id: 50000, name: 'Extra Item' }]]
      ]);

      const startTime = Date.now();
      const result = server.deepMergeDuplicates(input);
      const endTime = Date.now();

      expect(result.items).toHaveLength(50001);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Large File Operations', () => {
    it('should handle reading large JSON files', async () => {
      const largeData: any = {};
      for (let i = 0; i < 10000; i++) {
        largeData[`key${i}`] = {
          id: i,
          name: `Item ${i}`,
          description: `This is a description for item ${i}`,
          tags: Array(10).fill(0).map((_, j) => `tag${i}_${j}`),
          metadata: {
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            version: i % 100
          }
        };
      }

      const filePath = await createTestFile('large.json', largeData);
      
      const startTime = Date.now();
      const result = await server.readJsonFile(filePath);
      const endTime = Date.now();

      expect(result).toEqual(largeData);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle writing large JSON files', async () => {
      const largeData: any = {};
      for (let i = 0; i < 5000; i++) {
        largeData[`key${i}`] = `value${i}`.repeat(100); // Long strings
      }

      const filePath = path.join(testDir, 'large-write.json');
      
      const startTime = Date.now();
      await fs.writeFile(filePath, JSON.stringify(largeData, null, 2));
      const endTime = Date.now();

      const stats = await fs.stat(filePath);
      expect(stats.size).toBeGreaterThan(1000000); // Should be over 1MB
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle merging large files with duplicates', async () => {
      const baseData: any = {};
      for (let i = 0; i < 5000; i++) {
        baseData[`key${i}`] = `value${i}`;
      }

      const duplicateData: any = {};
      for (let i = 0; i < 5000; i++) {
        duplicateData[`key${i}`] = `updated${i}`;
      }

      const input = createObjectWithDuplicateKeys([
        ['data', baseData],
        ['data', duplicateData]
      ]);

      const filePath = await createTestFile('large-merge.json', input);
      
      const startTime = Date.now();
      await server.mergeDuplicateKeys(filePath);
      const endTime = Date.now();

      const result = await readTestFile(filePath);
      expect(result.data).toEqual(duplicateData);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });

  describe('Memory Management', () => {
    it('should not exceed memory limits with large objects', () => {
      const baseMemory = process.memoryUsage().heapUsed;
      
      // Create a very large object
      const largeObj: any = {};
      for (let i = 0; i < 50000; i++) {
        largeObj[`key${i}`] = {
          id: i,
          data: `Data for item ${i}`.repeat(10), // Long strings
          nested: {
            level1: {
              level2: {
                level3: `Deep value ${i}`
              }
            }
          }
        };
      }

      const input = createObjectWithDuplicateKeys([
        ['large', largeObj],
        ['large', { ...largeObj, 'extra': 'value' }]
      ]);

      const result = server.deepMergeDuplicates(input);
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - baseMemory;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      expect(result.large).toBeDefined();
    });

    it('should handle garbage collection with large operations', () => {
      const baseMemory = process.memoryUsage().heapUsed;
      
      // Perform many large operations
      for (let i = 0; i < 10; i++) {
        const largeObj: any = {};
        for (let j = 0; j < 10000; j++) {
          largeObj[`key${j}`] = `value${i}_${j}`;
        }
        
        const input = createObjectWithDuplicateKeys([
          ['large', largeObj],
          ['large', { ...largeObj, 'extra': `extra${i}` }]
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
      
      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024); // 200MB
    });
  });

  describe('Performance with Large Data', () => {
    it('should maintain performance with increasing data size', () => {
      const sizes = [1000, 5000, 10000, 20000];
      const times: number[] = [];

      sizes.forEach(size => {
        const largeObj: any = {};
        for (let i = 0; i < size; i++) {
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
        times.push(endTime - startTime);
      });

      // Performance should scale reasonably (not exponentially)
      const lastTime = times[times.length - 1];
      const firstTime = Math.max(times[0], 1); // Avoid division by zero
      const ratio = lastTime / firstTime;
      
      expect(ratio).toBeLessThan(50); // Should not be more than 50x slower
    });

    it('should handle large path operations efficiently', () => {
      const obj: any = {};
      const pathCount = 10000;
      
      const startTime = Date.now();
      for (let i = 0; i < pathCount; i++) {
        server.setValueAtPath(obj, `level${i}.nested.value`, `value${i}`);
      }
      const endTime = Date.now();

      expect(Object.keys(obj)).toHaveLength(pathCount);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Edge Cases with Large Data', () => {
    it('should handle objects with maximum string lengths', () => {
      const maxString = 'x'.repeat(1000000); // 1MB string
      const input = createObjectWithDuplicateKeys([
        ['largeString', 'short'],
        ['largeString', maxString]
      ]);

      const startTime = Date.now();
      const result = server.deepMergeDuplicates(input);
      const endTime = Date.now();

      expect(result.largeString).toBe(maxString);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle objects with many nested levels', () => {
      let deepObj: any = {};
      let current = deepObj;
      
      // Create 1000 levels of nesting
      for (let i = 0; i < 1000; i++) {
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
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle arrays with maximum elements', () => {
      const maxArray = Array(100000).fill(0).map((_, i) => i);
      
      const input = createObjectWithDuplicateKeys([
        ['array', maxArray],
        ['array', [...maxArray, 100000]]
      ]);

      const startTime = Date.now();
      const result = server.deepMergeDuplicates(input);
      const endTime = Date.now();

      expect(result.array).toHaveLength(100001);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
