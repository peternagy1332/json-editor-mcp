// Helper functions for creating test objects with duplicate keys
// This is needed because TypeScript doesn't allow duplicate keys in object literals

export function createObjectWithDuplicateKeys(entries: Array<[string, any]>): any {
  const obj: any = {};
  for (const [key, value] of entries) {
    obj[key] = value;
  }
  return obj;
}

export function createDuplicateKeyObject(key: string, firstValue: any, secondValue: any, otherEntries: Array<[string, any]> = []): any {
  const obj: any = {};
  obj[key] = firstValue;
  obj[key] = secondValue;
  for (const [k, v] of otherEntries) {
    obj[k] = v;
  }
  return obj;
}
