import { JsonEditorMCPServerTestable } from './JsonEditorMCPServerTestable';
import { createTestFile, readTestFile } from './setup';
import { createObjectWithDuplicateKeys } from './test-helpers';
import { promises as fs } from 'fs';
import path from 'path';

describe('Concurrency and Race Conditions', () => {
  let server: JsonEditorMCPServerTestable;
  const testDir = path.join(__dirname, 'temp');

  beforeEach(() => {
    server = new JsonEditorMCPServerTestable();
  });

  describe('Concurrent Deep Merge Operations', () => {
    it('should handle multiple deep merge operations concurrently', async () => {
      const operations = Array(10).fill(0).map(async (_, i) => {
        const input = createObjectWithDuplicateKeys([
          ['key', `value${i}`],
          ['key', `updated${i}`]
        ]);
        return server.deepMergeDuplicates(input);
      });

      const results = await Promise.all(operations);

      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result.key).toBe(`updated${i}`);
      });
    });

    it('should handle concurrent path operations', async () => {
      const obj: any = {};
      
      const operations = Array(10).fill(0).map(async (_, i) => {
        const path = `level${i}.nested.value`;
        server.setValueAtPath(obj, path, `value${i}`);
        return server.getValueAtPath(obj, path);
      });

      const results = await Promise.all(operations);

      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result).toBe(`value${i}`);
      });
    });

    it('should handle concurrent file operations', async () => {
      const filePath = await createTestFile('concurrent.json', {});
      
      const operations = Array(5).fill(0).map(async (_, i) => {
        const data = { [`key${i}`]: `value${i}` };
        await fs.writeFile(filePath, JSON.stringify(data));
        return server.readJsonFile(filePath);
      });

      const results = await Promise.all(operations);

      expect(results).toHaveLength(5);
      // The last operation should have the final state
      const lastResult = results[results.length - 1];
      expect(Object.keys(lastResult).length).toBeGreaterThan(0); // Should have some keys
    });
  });

  describe('Race Conditions', () => {
    it('should handle rapid successive operations on the same object', async () => {
      const obj: any = {};
      
      // Rapidly set and get values
      const operations = Array(100).fill(0).map(async (_, i) => {
        const key = `key${i % 10}`; // Reuse keys to create potential conflicts
        server.setValueAtPath(obj, key, `value${i}`);
        return server.getValueAtPath(obj, key);
      });

      const results = await Promise.all(operations);

      expect(results).toHaveLength(100);
      // All results should be valid (no undefined values)
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });
    });

    it('should handle concurrent modifications to nested objects', async () => {
      const obj: any = { nested: {} };
      
      const operations = Array(20).fill(0).map(async (_, i) => {
        const path = `nested.key${i % 5}`; // Reuse paths
        server.setValueAtPath(obj, path, `value${i}`);
        return server.getValueAtPath(obj, path);
      });

      const results = await Promise.all(operations);

      expect(results).toHaveLength(20);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });

    it('should handle concurrent deep merge operations on similar objects', async () => {
      const baseObject = {
        common: { key1: 'value1' },
        unique: { key2: 'value2' }
      };

      const operations = Array(10).fill(0).map(async (_, i) => {
        const input = createObjectWithDuplicateKeys([
          ['common', { key1: 'value1' }],
          ['common', { key1: `updated${i}`, key3: `new${i}` }],
          ['unique', { key2: `unique${i}` }]
        ]);
        return server.deepMergeDuplicates(input);
      });

      const results = await Promise.all(operations);

      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result.common.key1).toBe(`updated${i}`);
        expect(result.common.key3).toBe(`new${i}`);
        expect(result.unique.key2).toBe(`unique${i}`);
      });
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory with concurrent operations', async () => {
      const baseMemory = process.memoryUsage().heapUsed;
      
      // Perform many concurrent operations
      const operations = Array(50).fill(0).map(async (_, i) => {
        const input = createObjectWithDuplicateKeys([
          ['key', `value${i}`],
          ['key', `updated${i}`]
        ]);
        return server.deepMergeDuplicates(input);
      });

      await Promise.all(operations);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - baseMemory;
      
      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
    });

    it('should handle large concurrent operations efficiently', async () => {
      const startTime = Date.now();
      
      const operations = Array(20).fill(0).map(async (_, i) => {
        const largeObj: any = {};
        for (let j = 0; j < 1000; j++) {
          largeObj[`key${j}`] = `value${i}_${j}`;
        }
        
        const input = createObjectWithDuplicateKeys([
          ['large', largeObj],
          ['large', { ...largeObj, extra: `extra${i}` }]
        ]);
        
        return server.deepMergeDuplicates(input);
      });

      const results = await Promise.all(operations);
      const endTime = Date.now();

      expect(results).toHaveLength(20);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Error Handling in Concurrent Operations', () => {
    it('should handle errors in concurrent operations gracefully', async () => {
      const operations = [
        // Valid operation
        server.deepMergeDuplicates(createObjectWithDuplicateKeys([
          ['key', 'value1'],
          ['key', 'value2']
        ])),
        // Operation that might cause issues
        server.deepMergeDuplicates({}),
        // Another valid operation
        server.deepMergeDuplicates(createObjectWithDuplicateKeys([
          ['key2', 'value3'],
          ['key2', 'value4']
        ]))
      ];

      const results = await Promise.allSettled(operations);

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
      expect(results[2].status).toBe('fulfilled');
    });

    it('should handle file system errors in concurrent operations', async () => {
      const operations = [
        // Valid file operation
        createTestFile('valid.json', { key: 'value' }),
        // Invalid file operation (should not throw)
        server.readJsonFile('nonexistent.json'),
        // Another valid file operation
        createTestFile('valid2.json', { key2: 'value2' })
      ];

      const results = await Promise.allSettled(operations);

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled'); // Should return empty object
      expect(results[2].status).toBe('fulfilled');
    });
  });

  describe('Stress Testing', () => {
    it('should handle high-frequency operations', async () => {
      const operations = Array(1000).fill(0).map(async (_, i) => {
        const input = createObjectWithDuplicateKeys([
          ['key', `value${i}`],
          ['key', `updated${i}`]
        ]);
        return server.deepMergeDuplicates(input);
      });

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const endTime = Date.now();

      expect(results).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle mixed operation types concurrently', async () => {
      const obj: any = {};
      
      const operations = [
        // Deep merge operations
        ...Array(10).fill(0).map(async (_, i) => {
          const input = createObjectWithDuplicateKeys([
            ['merge', `value${i}`],
            ['merge', `updated${i}`]
          ]);
          return server.deepMergeDuplicates(input);
        }),
        // Path operations
        ...Array(10).fill(0).map(async (_, i) => {
          server.setValueAtPath(obj, `path${i}`, `value${i}`);
          return server.getValueAtPath(obj, `path${i}`);
        }),
        // Simple operations
        ...Array(10).fill(0).map(async (_, i) => {
          return server.deepMergeDuplicates({ simple: `value${i}` });
        })
      ];

      const results = await Promise.all(operations);

      expect(results).toHaveLength(30);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });

  describe('Thread Safety Simulation', () => {
    it('should handle operations that simulate multiple threads', async () => {
      const sharedObject: any = {};
      
      // Simulate multiple "threads" working on the same object
      const thread1 = async () => {
        for (let i = 0; i < 100; i++) {
          server.setValueAtPath(sharedObject, `thread1.key${i}`, `value${i}`);
        }
      };
      
      const thread2 = async () => {
        for (let i = 0; i < 100; i++) {
          server.setValueAtPath(sharedObject, `thread2.key${i}`, `value${i}`);
        }
      };
      
      const thread3 = async () => {
        for (let i = 0; i < 100; i++) {
          const input = createObjectWithDuplicateKeys([
            ['shared', `value${i}`],
            ['shared', `updated${i}`]
          ]);
          server.deepMergeDuplicates(input);
        }
      };

      await Promise.all([thread1(), thread2(), thread3()]);

      // Verify that all operations completed successfully
      expect(Object.keys(sharedObject.thread1 || {})).toHaveLength(100);
      expect(Object.keys(sharedObject.thread2 || {})).toHaveLength(100);
    });
  });
});
