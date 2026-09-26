import { describe, it, expect } from 'vitest';
import { takeLast } from '../../../src/utils/comments.js';

describe('takeLast', () => {
  it('returns all items when limit is undefined', () => {
    expect(takeLast([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('returns all items when limit is null', () => {
    expect(takeLast([1, 2, 3], null)).toEqual([1, 2, 3]);
  });

  it('returns the last N items in original order', () => {
    expect(takeLast([1, 2, 3, 4, 5], 2)).toEqual([4, 5]);
  });

  it('returns a copy, not the input array', () => {
    const input = [1, 2, 3];
    const result = takeLast(input);
    expect(result).toEqual(input);
    expect(result).not.toBe(input);
  });

  it('returns all items when limit exceeds length', () => {
    expect(takeLast([1, 2, 3], 10)).toEqual([1, 2, 3]);
  });

  it('returns empty array for limit 0', () => {
    expect(takeLast([1, 2, 3], 0)).toEqual([]);
  });

  it('returns empty array for negative limit', () => {
    expect(takeLast([1, 2, 3], -1)).toEqual([]);
  });

  it('returns empty array for non-integer limit', () => {
    expect(takeLast([1, 2, 3], Number.NaN)).toEqual([]);
    expect(takeLast([1, 2, 3], 1.5)).toEqual([]);
  });

  it('returns empty array for non-array input', () => {
    expect(takeLast(undefined, 3)).toEqual([]);
    expect(takeLast(null, 3)).toEqual([]);
    expect(takeLast('not-an-array', 3)).toEqual([]);
  });

  it('works on comment-like objects', () => {
    const comments = [
      { id: 1, content: 'first' },
      { id: 2, content: 'second' },
      { id: 3, content: 'third' },
    ];
    expect(takeLast(comments, 2)).toEqual([
      { id: 2, content: 'second' },
      { id: 3, content: 'third' },
    ]);
  });
});
