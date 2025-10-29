import { JsonEditorMCPServerTestable } from './JsonEditorMCPServerTestable';
import { createObjectWithDuplicateKeys, createDuplicateKeyObject } from './test-helpers';

describe('Unicode and Special Characters', () => {
  let server: JsonEditorMCPServerTestable;

  beforeEach(() => {
    server = new JsonEditorMCPServerTestable();
  });

  describe('Unicode Strings', () => {
    it('should handle basic Unicode characters', () => {
      const input = createObjectWithDuplicateKeys([
        ['hello', 'Hello'],
        ['hello', 'Hola'],
        ['world', 'World'],
        ['world', 'Mundo']
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result).toEqual({
        hello: 'Hola',
        world: 'Mundo'
      });
    });

    it('should handle emoji characters', () => {
      const input = createObjectWithDuplicateKeys([
        ['smile', '😊'],
        ['smile', '😄'],
        ['heart', '❤️'],
        ['heart', '💕']
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result).toEqual({
        smile: '😄',
        heart: '💕'
      });
    });

    it('should handle Unicode in nested objects', () => {
      const input = createObjectWithDuplicateKeys([
        ['greetings', {
          'en': 'Hello',
          'es': 'Hola',
          'fr': 'Bonjour'
        }],
        ['greetings', {
          'en': 'Hi',
          'de': 'Hallo',
          'ja': 'こんにちは'
        }]
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result).toEqual({
        greetings: {
          en: 'Hi',
          de: 'Hallo',
          ja: 'こんにちは'
        }
      });
    });

    it('should handle mixed scripts', () => {
      const input = createObjectWithDuplicateKeys([
        ['text', 'English text'],
        ['text', '中文文本'],
        ['text', 'العربية'],
        ['text', 'Русский текст']
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result).toEqual({
        text: 'Русский текст'
      });
    });
  });

  describe('Special Characters in Keys', () => {
    it('should handle keys with spaces', () => {
      const input = createObjectWithDuplicateKeys([
        ['key with spaces', 'value1'],
        ['key with spaces', 'value2']
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result).toEqual({
        'key with spaces': 'value2'
      });
    });

    it('should handle keys with special characters', () => {
      const input = createObjectWithDuplicateKeys([
        ['key-with-dashes', 'value1'],
        ['key_with_underscores', 'value2'],
        ['key.with.dots', 'value3'],
        ['key:with:colons', 'value4']
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result).toEqual({
        'key-with-dashes': 'value1',
        'key_with_underscores': 'value2',
        'key.with.dots': 'value3',
        'key:with:colons': 'value4'
      });
    });

    it('should handle keys with Unicode characters', () => {
      const input = createObjectWithDuplicateKeys([
        ['ключ', 'значение1'],
        ['ключ', 'значение2'],
        ['键', '值1'],
        ['键', '值2']
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result).toEqual({
        'ключ': 'значение2',
        '键': '值2'
      });
    });

    it('should handle keys with emoji', () => {
      const input = createObjectWithDuplicateKeys([
        ['😊', 'happy'],
        ['😊', 'joyful'],
        ['❤️', 'love'],
        ['❤️', 'heart']
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result).toEqual({
        '😊': 'joyful',
        '❤️': 'heart'
      });
    });
  });

  describe('Path Operations with Unicode', () => {
    it('should handle Unicode in path segments', () => {
      const obj: any = {};
      server.setValueAtPath(obj, '用户.姓名', '张三');
      server.setValueAtPath(obj, '用户.年龄', 25);

      expect(server.getValueAtPath(obj, '用户.姓名')).toBe('张三');
      expect(server.getValueAtPath(obj, '用户.年龄')).toBe(25);
    });

    it('should handle emoji in path segments', () => {
      const obj: any = {};
      server.setValueAtPath(obj, '😊.message', 'Hello!');
      server.setValueAtPath(obj, '❤️.feeling', 'Love');

      expect(server.getValueAtPath(obj, '😊.message')).toBe('Hello!');
      expect(server.getValueAtPath(obj, '❤️.feeling')).toBe('Love');
    });

    it('should handle mixed scripts in paths', () => {
      const obj: any = {};
      server.setValueAtPath(obj, 'user.name', 'John');
      server.setValueAtPath(obj, 'пользователь.имя', 'Иван');
      server.setValueAtPath(obj, '用户.姓名', '李四');

      expect(server.getValueAtPath(obj, 'user.name')).toBe('John');
      expect(server.getValueAtPath(obj, 'пользователь.имя')).toBe('Иван');
      expect(server.getValueAtPath(obj, '用户.姓名')).toBe('李四');
    });

    it('should handle special characters in paths', () => {
      const obj: any = {};
      server.setValueAtPath(obj, 'key-with-dashes.value', 'test1');
      server.setValueAtPath(obj, 'key_with_underscores.value', 'test2');
      server.setValueAtPath(obj, 'key:with:colons.value', 'test3');

      expect(server.getValueAtPath(obj, 'key-with-dashes.value')).toBe('test1');
      expect(server.getValueAtPath(obj, 'key_with_underscores.value')).toBe('test2');
      expect(server.getValueAtPath(obj, 'key:with:colons.value')).toBe('test3');
    });
  });

  describe('Unicode Normalization', () => {
    it('should handle different Unicode normalizations', () => {
      // These are different Unicode representations of the same character
      const nfc = 'café'; // NFC normalized
      const nfd = 'cafe\u0301'; // NFD normalized
      
      const input = createObjectWithDuplicateKeys([
        ['text', nfc],
        ['text', nfd]
      ]);

      const result = server.deepMergeDuplicates(input);

      // The result should be the last value, regardless of normalization
      expect(result.text).toBe(nfd);
    });

    it('should handle combining characters', () => {
      const input = createObjectWithDuplicateKeys([
        ['accent', 'e'],
        ['accent', 'é'],
        ['accent', 'e\u0301']
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result.accent).toBe('e\u0301');
    });
  });

  describe('Control Characters', () => {
    it('should handle control characters in values', () => {
      const input = createObjectWithDuplicateKeys([
        ['text', 'line1\nline2'],
        ['text', 'line1\r\nline2'],
        ['text', 'tab\tseparated']
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result.text).toBe('tab\tseparated');
    });

    it('should handle control characters in keys', () => {
      const input = createObjectWithDuplicateKeys([
        ['key\nwith\nnewlines', 'value1'],
        ['key\nwith\nnewlines', 'value2'],
        ['key\twith\ttabs', 'value3']
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result).toEqual({
        'key\nwith\nnewlines': 'value2',
        'key\twith\ttabs': 'value3'
      });
    });
  });

  describe('Large Unicode Strings', () => {
    it('should handle very long Unicode strings', () => {
      const longString = '这是一个很长的中文字符串'.repeat(1000);
      const input = createObjectWithDuplicateKeys([
        ['long', 'short'],
        ['long', longString]
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result.long).toBe(longString);
      expect(result.long.length).toBe(1000 * 12); // 12 characters per repetition (including spaces)
    });

    it('should handle strings with many different Unicode characters', () => {
      const unicodeString = 'Hello 世界 🌍 مرحبا بالعالم Здравствуй мир';
      const input = createObjectWithDuplicateKeys([
        ['greeting', 'Hello'],
        ['greeting', unicodeString]
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result.greeting).toBe(unicodeString);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty Unicode strings', () => {
      const input = createObjectWithDuplicateKeys([
        ['empty', ''],
        ['empty', ''],
        ['unicode', ''],
        ['unicode', '测试']
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result).toEqual({
        empty: '',
        unicode: '测试'
      });
    });

    it('should handle Unicode surrogate pairs', () => {
      const emoji = '😀'; // This is a surrogate pair
      const input = createObjectWithDuplicateKeys([
        ['emoji', 'text'],
        ['emoji', emoji]
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result.emoji).toBe(emoji);
    });

    it('should handle zero-width characters', () => {
      const textWithZW = 'Hello\u200BWorld'; // Zero-width space
      const input = createObjectWithDuplicateKeys([
        ['text', 'HelloWorld'],
        ['text', textWithZW]
      ]);

      const result = server.deepMergeDuplicates(input);

      expect(result.text).toBe(textWithZW);
    });
  });
});
