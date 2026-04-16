import { describe, it, expect } from 'vitest';
import { formatDate, truncate } from '../src/format.js';

describe('truncate', () => {
  it('returns string unchanged if under max length', () => {
    expect(truncate('short', 20)).toBe('short');
  });

  it('truncates and adds ellipsis', () => {
    expect(truncate('this is a very long string', 10)).toBe('this is...');
  });
});

describe('formatDate', () => {
  it('formats timestamp as M/DD', () => {
    const ts = new Date(2026, 3, 16).getTime();
    expect(formatDate(ts)).toBe('4/16');
  });
});
