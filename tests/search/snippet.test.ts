import { describe, it, expect } from 'vitest';
import { extractSnippet } from '../../src/search/snippet.js';

describe('extractSnippet', () => {
  it('wraps the match with both ellipses when in the middle', () => {
    const text = 'a'.repeat(50) + ' foo ' + 'b'.repeat(50);
    const start = text.indexOf('foo');
    const snippet = extractSnippet(text, start, start + 3, 10);
    expect(snippet).toMatch(/^…/);
    expect(snippet).toMatch(/…$/);
    expect(snippet).toContain('foo');
  });

  it('omits leading ellipsis when match is near the start', () => {
    const text = 'foo ' + 'a'.repeat(100);
    const snippet = extractSnippet(text, 0, 3, 10);
    expect(snippet.startsWith('…')).toBe(false);
    expect(snippet.startsWith('foo')).toBe(true);
  });

  it('omits trailing ellipsis when match is near the end', () => {
    const text = 'a'.repeat(100) + ' foo';
    const start = text.indexOf('foo');
    const snippet = extractSnippet(text, start, start + 3, 10);
    expect(snippet.endsWith('…')).toBe(false);
    expect(snippet.endsWith('foo')).toBe(true);
  });

  it('strips control characters', () => {
    const text = 'before\u0007foo\u001bafter';
    const start = text.indexOf('foo');
    const snippet = extractSnippet(text, start, start + 3, 10);
    expect(snippet).not.toContain('\u0007');
    expect(snippet).not.toContain('\u001b');
    expect(snippet).toContain('foo');
  });

  it('collapses whitespace', () => {
    const text = 'aaa    \n\n  foo  \n  bbb';
    const start = text.indexOf('foo');
    const snippet = extractSnippet(text, start, start + 3, 20);
    expect(snippet).not.toMatch(/\s{2,}/);
    expect(snippet).not.toContain('\n');
  });

  it('respects the radius parameter', () => {
    const text = 'x'.repeat(100) + 'foo' + 'y'.repeat(100);
    const start = text.indexOf('foo');
    const snippet = extractSnippet(text, start, start + 3, 5);
    const stripped = snippet.replace(/^…/, '').replace(/…$/, '');
    expect(stripped.length).toBeLessThanOrEqual(13);
  });

  it('defaults radius to 40 when not provided', () => {
    const text = 'x'.repeat(60) + 'foo' + 'y'.repeat(60);
    const start = text.indexOf('foo');
    const snippet = extractSnippet(text, start, start + 3);
    expect(snippet).toContain('foo');
    const stripped = snippet.replace(/^…/, '').replace(/…$/, '');
    expect(stripped.length).toBeLessThanOrEqual(40 + 3 + 40);
  });
});
