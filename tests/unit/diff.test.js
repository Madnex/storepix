import { describe, it } from 'node:test';
import assert from 'node:assert';
import { diff, formatDiff, hasDifferences, countChanges } from '../../src/utils/diff.js';

describe('diff module', () => {
  describe('diff', () => {
    it('should return all same for identical texts', () => {
      const text = 'line1\nline2\nline3';
      const result = diff(text, text);
      assert.strictEqual(result.length, 3);
      assert.ok(result.every(item => item.type === 'same'));
    });

    it('should detect additions', () => {
      const oldText = 'line1\nline3';
      const newText = 'line1\nline2\nline3';
      const result = diff(oldText, newText);

      const additions = result.filter(item => item.type === 'add');
      assert.strictEqual(additions.length, 1);
      assert.strictEqual(additions[0].content, 'line2');
    });

    it('should detect removals', () => {
      const oldText = 'line1\nline2\nline3';
      const newText = 'line1\nline3';
      const result = diff(oldText, newText);

      const removals = result.filter(item => item.type === 'remove');
      assert.strictEqual(removals.length, 1);
      assert.strictEqual(removals[0].content, 'line2');
    });

    it('should detect modifications (remove + add)', () => {
      const oldText = 'line1\nold line\nline3';
      const newText = 'line1\nnew line\nline3';
      const result = diff(oldText, newText);

      const removals = result.filter(item => item.type === 'remove');
      const additions = result.filter(item => item.type === 'add');

      assert.strictEqual(removals.length, 1);
      assert.strictEqual(removals[0].content, 'old line');
      assert.strictEqual(additions.length, 1);
      assert.strictEqual(additions[0].content, 'new line');
    });

    it('should handle empty old text', () => {
      const oldText = '';
      const newText = 'line1\nline2';
      const result = diff(oldText, newText);

      // Empty string splits to [''], so there's one remove of '' and two adds
      const additions = result.filter(item => item.type === 'add');
      assert.strictEqual(additions.length, 2);
    });

    it('should handle empty new text', () => {
      const oldText = 'line1\nline2';
      const newText = '';
      const result = diff(oldText, newText);

      const removals = result.filter(item => item.type === 'remove');
      assert.strictEqual(removals.length, 2);
    });

    it('should preserve line numbers', () => {
      const oldText = 'line1\nline2\nline3';
      const newText = 'line1\nmodified\nline3';
      const result = diff(oldText, newText);

      // Find the same lines and check their line numbers
      const sameLine1 = result.find(item => item.content === 'line1');
      assert.strictEqual(sameLine1.line, 1);

      const sameLine3 = result.find(item => item.content === 'line3');
      // line3 is now line 3 in the result
      assert.ok(sameLine3);
    });

    it('should handle multiple consecutive changes', () => {
      const oldText = 'a\nb\nc';
      const newText = 'x\ny\nz';
      const result = diff(oldText, newText);

      const removals = result.filter(item => item.type === 'remove');
      const additions = result.filter(item => item.type === 'add');

      assert.strictEqual(removals.length, 3);
      assert.strictEqual(additions.length, 3);
    });
  });

  describe('hasDifferences', () => {
    it('should return false for identical texts', () => {
      assert.strictEqual(hasDifferences('hello', 'hello'), false);
    });

    it('should return true for different texts', () => {
      assert.strictEqual(hasDifferences('hello', 'world'), true);
    });

    it('should return false for empty strings', () => {
      assert.strictEqual(hasDifferences('', ''), false);
    });

    it('should be case sensitive', () => {
      assert.strictEqual(hasDifferences('Hello', 'hello'), true);
    });

    it('should detect whitespace differences', () => {
      assert.strictEqual(hasDifferences('hello ', 'hello'), true);
      assert.strictEqual(hasDifferences('hello\n', 'hello'), true);
    });
  });

  describe('countChanges', () => {
    it('should count additions correctly', () => {
      const diffResult = [
        { type: 'same', line: 1, content: 'line1' },
        { type: 'add', line: 2, content: 'new line' },
        { type: 'same', line: 3, content: 'line3' }
      ];
      const counts = countChanges(diffResult);
      assert.strictEqual(counts.additions, 1);
      assert.strictEqual(counts.removals, 0);
    });

    it('should count removals correctly', () => {
      const diffResult = [
        { type: 'same', line: 1, content: 'line1' },
        { type: 'remove', line: 2, content: 'old line' },
        { type: 'same', line: 3, content: 'line3' }
      ];
      const counts = countChanges(diffResult);
      assert.strictEqual(counts.additions, 0);
      assert.strictEqual(counts.removals, 1);
    });

    it('should count both additions and removals', () => {
      const diffResult = [
        { type: 'remove', line: 1, content: 'old1' },
        { type: 'add', line: 1, content: 'new1' },
        { type: 'remove', line: 2, content: 'old2' },
        { type: 'add', line: 2, content: 'new2' }
      ];
      const counts = countChanges(diffResult);
      assert.strictEqual(counts.additions, 2);
      assert.strictEqual(counts.removals, 2);
    });

    it('should return zero for no changes', () => {
      const diffResult = [
        { type: 'same', line: 1, content: 'line1' },
        { type: 'same', line: 2, content: 'line2' }
      ];
      const counts = countChanges(diffResult);
      assert.strictEqual(counts.additions, 0);
      assert.strictEqual(counts.removals, 0);
    });

    it('should handle empty diff result', () => {
      const counts = countChanges([]);
      assert.strictEqual(counts.additions, 0);
      assert.strictEqual(counts.removals, 0);
    });
  });

  describe('formatDiff', () => {
    it('should return empty string for no changes', () => {
      const diffResult = [
        { type: 'same', line: 1, content: 'line1' },
        { type: 'same', line: 2, content: 'line2' }
      ];
      const formatted = formatDiff(diffResult);
      assert.strictEqual(formatted, '');
    });

    it('should format additions with green color codes', () => {
      const diffResult = [
        { type: 'same', line: 1, content: 'line1' },
        { type: 'add', line: 2, content: 'new line' },
        { type: 'same', line: 3, content: 'line3' }
      ];
      const formatted = formatDiff(diffResult);
      assert.ok(formatted.includes('\x1b[32m+ new line\x1b[0m'));
    });

    it('should format removals with red color codes', () => {
      const diffResult = [
        { type: 'same', line: 1, content: 'line1' },
        { type: 'remove', line: 2, content: 'old line' },
        { type: 'same', line: 3, content: 'line3' }
      ];
      const formatted = formatDiff(diffResult);
      assert.ok(formatted.includes('\x1b[31m- old line\x1b[0m'));
    });

    it('should include context lines', () => {
      const diffResult = [
        { type: 'same', line: 1, content: 'context before' },
        { type: 'add', line: 2, content: 'new line' },
        { type: 'same', line: 3, content: 'context after' }
      ];
      const formatted = formatDiff(diffResult, 1);
      assert.ok(formatted.includes('context before'));
      assert.ok(formatted.includes('context after'));
    });
  });

  describe('integration: diff and countChanges', () => {
    it('should work together for real diff scenario', () => {
      const oldText = `function hello() {
  console.log('Hello');
  return true;
}`;
      const newText = `function hello() {
  console.log('Hello, World!');
  return true;
}`;

      const result = diff(oldText, newText);
      const counts = countChanges(result);

      // One line changed (old removed, new added)
      assert.strictEqual(counts.removals, 1);
      assert.strictEqual(counts.additions, 1);
    });
  });
});
