import { JsonEditorMCPServerTestable } from './JsonEditorMCPServerTestable';
import { createObjectWithDuplicateKeys, createDuplicateKeyObject } from './test-helpers';

describe('Deep Merge Functionality', () => {
  let server: JsonEditorMCPServerTestable;

  beforeEach(() => {
    server = new JsonEditorMCPServerTestable();
  });

  describe('deepMergeDuplicates', () => {
    it('should merge duplicate keys with primitive values (last value wins)', () => {
      const input = createObjectWithDuplicateKeys([
        ["key1", "value1"],
        ["key1", "value2"],
        ["key2", "value3"]
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result).toEqual({
        "key1": "value2",
        "key2": "value3"
      });
    });

    it('should merge duplicate keys with nested objects', () => {
      const input = createObjectWithDuplicateKeys([
        ["common", {
          "someKey1": "someValue1",
          "subKey1": {
            "subKey11": "subValue11",
            "subKey12": "subValue12"
          }
        }],
        ["common", {
          "someKey1": "someValue2",
          "someKey2": "someValue3",
          "subKey1": {
            "subKey11": "subValue11",
            "subKey12": "subValue12",
            "subKey13": "subValue13"
          }
        }]
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result).toEqual({
        "common": {
          "someKey1": "someValue2",
          "someKey2": "someValue3",
          "subKey1": {
            "subKey11": "subValue11",
            "subKey12": "subValue12",
            "subKey13": "subValue13"
          }
        }
      });
    });

    it('should handle multiple levels of duplicate keys', () => {
      const level1Obj1 = {
        "level2": {
          "key1": "value1"
        }
      };
      
      const level1Obj2: any = {};
      level1Obj2["level2"] = {
        "key1": "value2",
        "key2": "value3"
      };
      level1Obj2["level2"] = {
        "key3": "value4"
      };
      
      const input = createObjectWithDuplicateKeys([
        ["level1", level1Obj1],
        ["level1", level1Obj2]
      ]);

      const result = server.deepMergeDuplicates(input);

      // The result should merge the top-level "level1" keys,
      // but within level1Obj2, only the last "level2" value is kept
      // This is the correct behavior since JavaScript only keeps the last value for duplicate keys
      expect(result).toEqual({
        "level1": {
          "level2": {
            "key3": "value4"
          }
        }
      });
    });

    it('should handle arrays (last value wins)', () => {
      const input = createDuplicateKeyObject("array", [1, 2, 3], [4, 5, 6]);

      const result = server.deepMergeDuplicates(input);

      expect(result).toEqual({
        "array": [4, 5, 6]
      });
    });

    it('should handle mixed types (last value wins)', () => {
      const input = createDuplicateKeyObject("mixed", { "key": "value" }, "string");

      const result = server.deepMergeDuplicates(input);

      expect(result).toEqual({
        "mixed": "string"
      });
    });

    it('should handle null and undefined values', () => {
      const input = createObjectWithDuplicateKeys([
        ["nullKey", null],
        ["nullKey", "value"],
        ["undefinedKey", undefined],
        ["undefinedKey", "value"]
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result).toEqual({
        "nullKey": "value",
        "undefinedKey": "value"
      });
    });

    it('should handle empty objects', () => {
      const input = createDuplicateKeyObject("empty", {}, { "key": "value" });

      const result = server.deepMergeDuplicates(input);

      expect(result).toEqual({
        "empty": { "key": "value" }
      });
    });

    it('should return primitive values as-is', () => {
      expect(server.deepMergeDuplicates("string")).toBe("string");
      expect(server.deepMergeDuplicates(123)).toBe(123);
      expect(server.deepMergeDuplicates(true)).toBe(true);
      expect(server.deepMergeDuplicates(null)).toBe(null);
      expect(server.deepMergeDuplicates(undefined)).toBe(undefined);
    });

    it('should return arrays as-is', () => {
      const array = [1, 2, 3];
      expect(server.deepMergeDuplicates(array)).toBe(array);
    });
  });

  describe('deepMerge', () => {
    it('should merge two objects recursively', () => {
      const target = {
        "key1": "value1",
        "key2": {
          "nested1": "nestedValue1",
          "nested2": "nestedValue2"
        }
      };

      const source = {
        "key1": "updatedValue1",
        "key2": {
          "nested2": "updatedNestedValue2",
          "nested3": "newNestedValue3"
        },
        "key3": "newValue3"
      };

      const result = server.deepMerge(target, source);

      expect(result).toEqual({
        "key1": "updatedValue1",
        "key2": {
          "nested1": "nestedValue1",
          "nested2": "updatedNestedValue2",
          "nested3": "newNestedValue3"
        },
        "key3": "newValue3"
      });
    });

    it('should handle null and undefined sources', () => {
      const target = { "key": "value" };
      
      expect(server.deepMerge(target, null)).toBeNull();
      expect(server.deepMerge(target, undefined)).toBeUndefined();
    });

    it('should handle null and undefined targets', () => {
      const source = { "key": "value" };
      
      expect(server.deepMerge(null, source)).toEqual(source);
      expect(server.deepMerge(undefined, source)).toEqual(source);
    });

    it('should handle arrays (source wins)', () => {
      const target = { "array": [1, 2, 3] };
      const source = { "array": [4, 5, 6] };

      const result = server.deepMerge(target, source);

      expect(result).toEqual({ "array": [4, 5, 6] });
    });

    it('should handle mixed types (source wins)', () => {
      const target = { "key": { "nested": "value" } };
      const source = { "key": "string" };

      const result = server.deepMerge(target, source);

      expect(result).toEqual({ "key": "string" });
    });

    it('should not mutate the original target object', () => {
      const target = { "key": "value" };
      const source = { "key": "newValue" };

      server.deepMerge(target, source);

      expect(target).toEqual({ "key": "value" });
    });
  });

  describe('Complex scenarios', () => {
    it('should handle deeply nested duplicate keys', () => {
      const input = createObjectWithDuplicateKeys([
        ["a", {
          "b": {
            "c": {
              "d": "value1"
            }
          }
        }],
        ["a", {
          "b": {
            "c": {
              "d": "value2",
              "e": "value3"
            },
            "f": "value4"
          }
        }]
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result).toEqual({
        "a": {
          "b": {
            "c": {
              "d": "value2",
              "e": "value3"
            },
            "f": "value4"
          }
        }
      });
    });

    it('should handle multiple duplicate keys at the same level', () => {
      const input = createObjectWithDuplicateKeys([
        ["key1", "value1"],
        ["key2", "value2"],
        ["key1", "value1Updated"],
        ["key3", "value3"],
        ["key2", "value2Updated"]
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result).toEqual({
        "key1": "value1Updated",
        "key2": "value2Updated",
        "key3": "value3"
      });
    });

    it('should handle the original user example', () => {
      const input = createObjectWithDuplicateKeys([
        ["common", {
          "someKey1": "someValue1",
          "subKey1": {
            "subKey11": "subValue11",
            "subKey12": "subValue12"
          }
        }],
        ["common", {
          "someKey1": "someValue2",
          "someKey2": "someValue3",
          "subKey1": {
            "subKey11": "subValue11",
            "subKey12": "subValue12",
            "subKey13": "subValue13"
          }
        }]
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result).toEqual({
        "common": {
          "someKey1": "someValue2",
          "someKey2": "someValue3",
          "subKey1": {
            "subKey11": "subValue11",
            "subKey12": "subValue12",
            "subKey13": "subValue13"
          }
        }
      });
    });
  });
});