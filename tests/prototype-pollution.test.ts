import { JsonEditorMCPServerTestable } from './JsonEditorMCPServerTestable';
import { createTestFile, readTestFile } from './setup';

const blockedPaths: ReadonlyArray<readonly [string, string]> = [
  ['__proto__', '__proto__'],
  ['prototype', 'prototype'],
  ['constructor', 'constructor'],
  ['a.__proto__', '__proto__'],
  ['a.prototype', 'prototype'],
  ['a.constructor', 'constructor'],
  ['a.b.__proto__.c', '__proto__'],
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

describe('Prototype safety', () => {
  let server: JsonEditorMCPServerTestable;

  beforeEach(() => {
    server = new JsonEditorMCPServerTestable();
  });

  afterEach(() => {
    expect(Object.hasOwn(Object.prototype, 'pwned')).toBe(false);
    expect(Object.hasOwn(Object.prototype, 'added')).toBe(false);
    expect(typeof Object.prototype.toString).toBe('function');
    expect(typeof Object.prototype.constructor).toBe('function');
  });

  describe('blocked path segments', () => {
    it.each(blockedPaths)('set rejects %s', (blockedPath, segment) => {
      const obj: Record<string, unknown> = { a: { b: { stay: true } } };
      expect(() => server.setValueAtPath(obj, blockedPath, 'x')).toThrow(
        `Invalid path segment: ${segment}`,
      );
      expect(obj).toEqual({ a: { b: { stay: true } } });
      expect(Object.getPrototypeOf(obj)).toBe(Object.prototype);
    });

    it.each(blockedPaths)('get rejects %s', (blockedPath, segment) => {
      const obj: Record<string, unknown> = { a: { b: { stay: true } } };
      expect(() => server.getValueAtPath(obj, blockedPath)).toThrow(
        `Invalid path segment: ${segment}`,
      );
    });

    it.each(blockedPaths)('delete rejects %s', (blockedPath, segment) => {
      const obj: Record<string, unknown> = { a: { b: { stay: true } } };
      expect(() => server.deleteValueAtPath(obj, blockedPath)).toThrow(
        `Invalid path segment: ${segment}`,
      );
      expect(obj).toEqual({ a: { b: { stay: true } } });
    });

    it('does not adopt an object assigned through __proto__', () => {
      const obj: Record<string, unknown> = { stay: true };
      expect(() => server.setValueAtPath(obj, '__proto__', { pwned: 'x' })).toThrow(
        'Invalid path segment: __proto__',
      );
      expect(obj).toEqual({ stay: true });
      expect(Object.getPrototypeOf(obj)).toBe(Object.prototype);
    });
  });

  describe('inherited properties', () => {
    it('reads and deletes an own toString without touching the prototype method', () => {
      const obj: Record<string, unknown> = { toString: 'own' };
      expect(server.getValueAtPath(obj, 'toString')).toBe('own');

      server.setValueAtPath(obj, 'toString', 'updated');
      expect(server.getValueAtPath(obj, 'toString')).toBe('updated');

      server.deleteValueAtPath(obj, 'toString');
      expect(() => server.getValueAtPath(obj, 'toString')).toThrow('toString does not exist');
    });

    it('does not read or delete a key that exists only on the prototype', () => {
      const proto = { pwned: 'secret' };
      const obj: object = Object.create(proto);

      expect(() => server.getValueAtPath(obj, 'pwned')).toThrow('pwned does not exist');
      expect(() => server.deleteValueAtPath(obj, 'pwned')).toThrow('pwned does not exist');
      expect(proto.pwned).toBe('secret');
    });

    it('creates an own object instead of writing into an inherited one', () => {
      const shared = { keep: true };
      const obj: object = Object.create({ nested: shared });

      server.setValueAtPath(obj, 'nested.added', 1);

      expect(shared).toEqual({ keep: true });
      expect(Object.hasOwn(obj, 'nested')).toBe(true);
      expect(server.getValueAtPath(obj, 'nested.added')).toBe(1);
      expect(() => server.getValueAtPath(obj, 'nested.keep')).toThrow('keep does not exist');
    });
  });

  describe('ordinary paths', () => {
    it.each(['__PROTO__.pwned', 'constructorName.field', 'prototypeName.field', 'proto.child'])(
      'allows %s',
      (safePath) => {
        const obj: Record<string, unknown> = {};
        server.setValueAtPath(obj, safePath, 'x');
        expect(server.getValueAtPath(obj, safePath)).toBe('x');
        expect(Object.getPrototypeOf(obj)).toBe(Object.prototype);
      },
    );

    it('updates an array index and replaces a null intermediate', () => {
      const obj: Record<string, unknown> = { items: ['a', 'b'], slot: null };
      server.setValueAtPath(obj, 'items.0', 'z');
      server.setValueAtPath(obj, 'slot.child', 1);

      expect(server.getValueAtPath(obj, 'items.0')).toBe('z');
      expect(obj.slot).toEqual({ child: 1 });
    });

    it('keeps a null prototype on the root object', () => {
      const obj: object = Object.create(null);
      server.setValueAtPath(obj, 'a.b', 1);

      expect(Object.getPrototypeOf(obj)).toBeNull();
      expect(server.getValueAtPath(obj, 'a.b')).toBe(1);

      server.deleteValueAtPath(obj, 'a.b');
      expect(() => server.getValueAtPath(obj, 'a.b')).toThrow('b does not exist');
    });
  });

  describe('deep merge', () => {
    it('stores a __proto__ key as own data', () => {
      const source: unknown = JSON.parse('{"__proto__":{"pwned":"no"},"name":"ok"}');
      const result: unknown = server.deepMerge({ keep: true }, source);

      expect(isRecord(result)).toBe(true);
      if (!isRecord(result)) {
        return;
      }
      expect(result.keep).toBe(true);
      expect(result.name).toBe('ok');
      expect(Object.hasOwn(result, '__proto__')).toBe(true);
      expect(Reflect.get(result, '__proto__')).toEqual({ pwned: 'no' });
      expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    });

    it('stores constructor and prototype keys as own data', () => {
      const result: unknown = server.deepMerge(
        {},
        { constructor: { kind: 'own' }, prototype: { kind: 'own' } },
      );

      expect(isRecord(result)).toBe(true);
      if (!isRecord(result)) {
        return;
      }
      expect(Object.hasOwn(result, 'constructor')).toBe(true);
      expect(Object.hasOwn(result, 'prototype')).toBe(true);
      expect(result.constructor).toEqual({ kind: 'own' });
      expect(result.prototype).toEqual({ kind: 'own' });
    });
  });

  describe('file tools', () => {
    it('rejects a dangerous write and still accepts a later write', async () => {
      const filePath = await createTestFile('recover.json', { name: 'ok' });

      const rejected = await server.writeMultipleJsonValues([filePath], '__proto__.pwned', 'CANARY');
      expect(rejected[filePath]).toBe('Error: Invalid path segment: __proto__');
      expect(await readTestFile(filePath)).toEqual({ name: 'ok' });

      const written = await server.writeMultipleJsonValues([filePath], 'title', 'Hello');
      expect(written[filePath]).toBe('Successfully wrote');
      expect(await readTestFile(filePath)).toEqual({ name: 'ok', title: 'Hello' });
    });

    it('does not write a file when an object value mixes a safe key with a dangerous key', async () => {
      const filePath = await createTestFile('mixed.json', { name: 'ok' });
      const results = await server.writeMultipleJsonValues(
        [filePath],
        'meta',
        '{"title":"Hello","__proto__":{"pwned":"x"}}',
      );

      expect(results[filePath]).toContain('Invalid path segment: __proto__');
      expect(await readTestFile(filePath)).toEqual({ name: 'ok' });
    });

    it('rejects a Python dict whose key is __proto__', async () => {
      const filePath = await createTestFile('python-proto.json', { name: 'ok' });
      const results = await server.writeMultipleJsonValues(
        [filePath],
        'meta',
        "{'__proto__': {'pwned': 'x'}}",
      );

      expect(results[filePath]).toContain('Invalid path segment: __proto__');
      expect(await readTestFile(filePath)).toEqual({ name: 'ok' });
    });

    it('rejects an empty object assigned at __proto__', async () => {
      const filePath = await createTestFile('empty-proto.json', { name: 'ok' });
      const results = await server.writeMultipleJsonValues([filePath], '__proto__', '{}');

      expect(results[filePath]).toBe('Error: Invalid path segment: __proto__');
      expect(await readTestFile(filePath)).toEqual({ name: 'ok' });
    });

    it('rejects constructor.prototype on write', async () => {
      const filePath = await createTestFile('constructor-path.json', { name: 'ok' });
      const results = await server.writeMultipleJsonValues(
        [filePath],
        'constructor.prototype.pwned',
        'x',
      );

      expect(results[filePath]).toBe('Error: Invalid path segment: constructor');
      expect(await readTestFile(filePath)).toEqual({ name: 'ok' });
    });

    it('rejects a dangerous delete in every file and leaves them unchanged', async () => {
      const fileA = await createTestFile('del-a.json', { name: 'a', nested: { keep: true } });
      const fileB = await createTestFile('del-b.json', { name: 'b', nested: { keep: true } });
      const results = await server.deleteMultipleJsonValues(
        [fileA, fileB],
        'nested.__proto__.keep',
      );

      expect(results[fileA]).toContain('Invalid path segment: __proto__');
      expect(results[fileB]).toContain('Invalid path segment: __proto__');
      expect(await readTestFile(fileA)).toEqual({ name: 'a', nested: { keep: true } });
      expect(await readTestFile(fileB)).toEqual({ name: 'b', nested: { keep: true } });
    });

    it('preserves an own __proto__ key when merging a file', async () => {
      const original: unknown = JSON.parse('{"__proto__":{"pwned":"no"},"name":"ok"}');
      const filePath = await createTestFile('merge-proto.json', original);

      await server.mergeDuplicateKeys(filePath);

      const saved: unknown = await readTestFile(filePath);
      expect(isRecord(saved)).toBe(true);
      if (!isRecord(saved)) {
        return;
      }
      expect(saved.name).toBe('ok');
      expect(Object.hasOwn(saved, '__proto__')).toBe(true);
      expect(Reflect.get(saved, '__proto__')).toEqual({ pwned: 'no' });
      expect(Object.getPrototypeOf(saved)).toBe(Object.prototype);
    });
  });
});
