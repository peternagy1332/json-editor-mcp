import { JsonEditorMCPServerTestable } from './JsonEditorMCPServerTestable';
import { createObjectWithDuplicateKeys, createDuplicateKeyObject } from './test-helpers';

describe('Edge Cases and Error Scenarios', () => {
  let server: JsonEditorMCPServerTestable;

  beforeEach(() => {
    server = new JsonEditorMCPServerTestable();
  });

  describe('Deep Merge Edge Cases', () => {
    it('should handle circular references gracefully', () => {
      const obj1: any = { "key": "value1" };
      const obj2: any = { "key": "value2" };
      
      // Create circular reference
      obj1.circular = obj1;
      obj2.circular = obj2;
      
      const input = createObjectWithDuplicateKeys([
        ["obj", obj1],
        ["obj", obj2]
      ]);
      
      // This should not throw an error, but may not handle circular refs perfectly
      expect(() => {
        const result = server.deepMergeDuplicates(input);
        expect(result).toBeDefined();
      }).not.toThrow();
    });

    it('should handle very deep nesting', () => {
      let deepObj: any = {};
      let current = deepObj;
      
      // Create 100 levels of nesting
      for (let i = 0; i < 100; i++) {
        current[`level${i}`] = {};
        current = current[`level${i}`];
      }
      current.value = "deepValue";
      
      const input = createObjectWithDuplicateKeys([
        ["deep", deepObj],
        ["deep", { ...deepObj, "level0": { ...deepObj.level0, "extra": "value" } }]
      ]);
      
      const result = server.deepMergeDuplicates(input);
      expect(result).toBeDefined();
      expect(result.deep).toBeDefined();
    });

    it('should handle objects with prototype properties', () => {
      const obj1 = Object.create({ prototypeProp: "value1" });
      obj1.ownProp = "value1";
      
      const obj2 = Object.create({ prototypeProp: "value2" });
      obj2.ownProp = "value2";
      
      const input = createObjectWithDuplicateKeys([
        ["obj", obj1],
        ["obj", obj2]
      ]);
      
      const result = server.deepMergeDuplicates(input);
      
      // Should only merge own properties, not prototype properties
      expect(result.obj.ownProp).toBe("value2");
      expect(result.obj.prototypeProp).toBeUndefined();
    });

    it('should handle special object types', () => {
      const date1 = new Date('2023-01-01');
      const date2 = new Date('2023-12-31');
      
      const input = createDuplicateKeyObject("date", date1, date2);
      
      const result = server.deepMergeDuplicates(input);
      // Since there are no duplicate keys in the input (only the last value is kept),
      // the result should be the same as the input
      // However, Date objects are not plain objects, so they should be returned as-is
      expect(result).toEqual({ date: date2 });
    });

    it('should handle functions', () => {
      const func1 = () => "function1";
      const func2 = () => "function2";
      
      const input = createDuplicateKeyObject("func", func1, func2);
      
      const result = server.deepMergeDuplicates(input);
      expect(result.func).toBe(func2);
    });

    it('should handle symbols', () => {
      const sym1 = Symbol('symbol1');
      const sym2 = Symbol('symbol2');
      
      const input = createDuplicateKeyObject("sym", sym1, sym2);
      
      const result = server.deepMergeDuplicates(input);
      expect(result.sym).toBe(sym2);
    });
  });

  describe('Path Operations Edge Cases', () => {
    it('should handle paths with special characters', () => {
      const obj: any = {};
      server.setValueAtPath(obj, "key.with.dots", "value");
      expect(server.getValueAtPath(obj, "key.with.dots")).toBe("value");
    });

    it('should handle empty string keys', () => {
      const obj: any = {};
      server.setValueAtPath(obj, "", "value");
      expect(obj[""]).toBe("value");
    });

    it('should handle numeric keys', () => {
      const obj: any = {};
      server.setValueAtPath(obj, "0", "value");
      expect(server.getValueAtPath(obj, "0")).toBe("value");
    });

    it('should handle very long paths', () => {
      const obj: any = {};
      const longPath = Array(1000).fill("level").join(".");
      server.setValueAtPath(obj, longPath, "value");
      expect(server.getValueAtPath(obj, longPath)).toBe("value");
    });

    it('should handle paths with spaces', () => {
      const obj: any = {};
      server.setValueAtPath(obj, "key with spaces", "value");
      expect(server.getValueAtPath(obj, "key with spaces")).toBe("value");
    });
  });

  describe('Type Coercion Edge Cases', () => {
    it('should handle string numbers in paths', () => {
      const obj: any = { "0": { "1": "value" } };
      expect(server.getValueAtPath(obj, "0.1")).toBe("value");
    });

    it('should handle boolean-like strings in paths', () => {
      const obj: any = { "true": { "false": "value" } };
      expect(server.getValueAtPath(obj, "true.false")).toBe("value");
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle large objects', () => {
      const largeObj: any = {};
      
      // Create an object with 1000 keys
      for (let i = 0; i < 1000; i++) {
        largeObj[`key${i}`] = `value${i}`;
      }
      
      const input = createObjectWithDuplicateKeys([
        ["large", largeObj],
        ["large", { ...largeObj, "extra": "value" }]
      ]);
      
      const result = server.deepMergeDuplicates(input);
      expect(result.large).toBeDefined();
      expect(Object.keys(result.large)).toHaveLength(1001); // 1000 + 1 extra
    });

    it('should handle many duplicate keys', () => {
      const entries: Array<[string, any]> = [];
      
      // Create 100 duplicate keys
      for (let i = 0; i < 100; i++) {
        entries.push([`key${i}`, `value${i}`]);
        entries.push([`key${i}`, `updatedValue${i}`]);
      }
      
      const input = createObjectWithDuplicateKeys(entries);
      const result = server.deepMergeDuplicates(input);
      
      // All values should be the updated versions
      for (let i = 0; i < 100; i++) {
        expect(result[`key${i}`]).toBe(`updatedValue${i}`);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed paths gracefully', () => {
      const obj = { "key": "value" };
      
      expect(() => server.getValueAtPath(obj, "key.")).toThrow();
      expect(() => server.getValueAtPath(obj, ".key")).toThrow();
      expect(() => server.getValueAtPath(obj, "key..nested")).toThrow();
    });

    it('should handle null and undefined objects in path operations', () => {
      expect(() => server.getValueAtPath(null, "key")).toThrow();
      expect(() => server.getValueAtPath(undefined, "key")).toThrow();
      
      expect(() => server.setValueAtPath(null, "key", "value")).toThrow();
      expect(() => server.setValueAtPath(undefined, "key", "value")).toThrow();
    });

    it('should handle non-object values in path operations', () => {
      expect(() => server.getValueAtPath("string", "key")).toThrow();
      expect(() => server.getValueAtPath(123, "key")).toThrow();
      expect(() => server.getValueAtPath(true, "key")).toThrow();
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle empty objects', () => {
      const result = server.deepMergeDuplicates({});
      expect(result).toEqual({});
    });

    it('should handle single key objects', () => {
      const input = { "key": "value" };
      const result = server.deepMergeDuplicates(input);
      expect(result).toEqual(input);
    });

    it('should handle objects with only duplicate keys', () => {
      const input = createDuplicateKeyObject("key", "value1", "value2");
      const result = server.deepMergeDuplicates(input);
      expect(result).toEqual({ "key": "value2" });
    });

    it('should handle deeply nested single values', () => {
      const obj: any = {};
      server.setValueAtPath(obj, "a.b.c.d.e.f.g.h.i.j", "deepValue");
      expect(server.getValueAtPath(obj, "a.b.c.d.e.f.g.h.i.j")).toBe("deepValue");
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle i18n translation files with duplicate keys', () => {
      const input = createObjectWithDuplicateKeys([
        ["common", {
          "welcome": "Welcome",
          "goodbye": "Goodbye"
        }],
        ["common", {
          "welcome": "Bienvenue",
          "hello": "Bonjour"
        }]
      ]);
      
      const result = server.deepMergeDuplicates(input);
      expect(result).toEqual({
        "common": {
          "welcome": "Bienvenue",
          "hello": "Bonjour"
        }
      });
    });

    it('should handle configuration files with nested settings', () => {
      const input = createObjectWithDuplicateKeys([
        ["database", {
          "host": "localhost",
          "port": 5432,
          "credentials": {
            "username": "user",
            "password": "pass"
          }
        }],
        ["database", {
          "host": "production.example.com",
          "credentials": {
            "username": "prod_user",
            "ssl": true
          }
        }]
      ]);
      
      const result = server.deepMergeDuplicates(input);
      expect(result).toEqual({
        "database": {
          "host": "production.example.com",
          "credentials": {
            "username": "prod_user",
            "ssl": true
          }
        }
      });
    });
  });
});