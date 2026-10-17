const BLOCKED_PATH_SEGMENTS: ReadonlySet<string> = new Set([
  '__proto__',
  'prototype',
  'constructor',
]);

function pathKeys(path: string): string[] {
  const keys = path.split('.');
  for (const key of keys) {
    if (BLOCKED_PATH_SEGMENTS.has(key)) {
      throw new Error(`Invalid path segment: ${key}`);
    }
  }
  return keys;
}

function isContainer(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

function keyAt(keys: string[], index: number): string {
  const key = keys[index];
  if (key === undefined) {
    throw new Error('Invalid path');
  }
  return key;
}

// Bracket assignment to "__proto__" runs the prototype setter.
// defineProperty stores the name as an own data property instead.
export function assignOwnProperty(target: object, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

export function getValueAtPath(obj: unknown, path: string): unknown {
  const keys = pathKeys(path);
  let current: unknown = obj;

  for (let i = 0; i < keys.length; i++) {
    const key = keyAt(keys, i);
    if (!isContainer(current)) {
      throw new Error(`Path ${path} not found: ${key} is not an object`);
    }
    if (!Object.hasOwn(current, key)) {
      throw new Error(`Path ${path} not found: ${key} does not exist`);
    }
    current = Reflect.get(current, key);
  }

  return current;
}

export function setValueAtPath(obj: unknown, path: string, value: unknown): void {
  const keys = pathKeys(path);
  if (!isContainer(obj)) {
    throw new TypeError('Cannot set path on non-object');
  }

  let current: object = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keyAt(keys, i);
    const existing = Object.hasOwn(current, key) ? Reflect.get(current, key) : undefined;
    if (!isContainer(existing)) {
      const child = {};
      assignOwnProperty(current, key, child);
      current = child;
    } else {
      current = existing;
    }
  }

  assignOwnProperty(current, keyAt(keys, keys.length - 1), value);
}

export function deleteValueAtPath(obj: unknown, path: string): void {
  const keys = pathKeys(path);
  let current: unknown = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keyAt(keys, i);
    if (!isContainer(current)) {
      throw new Error(`Path ${path} not found: ${key} is not an object`);
    }
    if (!Object.hasOwn(current, key)) {
      throw new Error(`Path ${path} not found: ${key} does not exist`);
    }
    current = Reflect.get(current, key);
  }

  const lastKey = keyAt(keys, keys.length - 1);
  if (!isContainer(current)) {
    throw new Error(`Path ${path} not found: cannot delete from non-object`);
  }
  if (!Object.hasOwn(current, lastKey) || !Reflect.deleteProperty(current, lastKey)) {
    throw new Error(`Path ${path} not found: ${lastKey} does not exist`);
  }
}
