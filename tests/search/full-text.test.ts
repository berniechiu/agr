import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { searchSessionFile } from '../../src/search/full-text.js';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

describe('searchSessionFile', () => {
  it('finds matching text in user messages', async () => {
    const matches = await searchSessionFile(
      join(FIXTURES, 'valid-session.jsonl'),
      'login',
    );
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].text).toContain('login');
  });

  it('finds matching text in assistant messages', async () => {
    const matches = await searchSessionFile(
      join(FIXTURES, 'valid-session.jsonl'),
      'signup',
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it('returns empty array for no match', async () => {
    const matches = await searchSessionFile(
      join(FIXTURES, 'valid-session.jsonl'),
      'zzzznonexistentzzzz',
    );
    expect(matches).toEqual([]);
  });

  it('is case insensitive', async () => {
    const matches = await searchSessionFile(
      join(FIXTURES, 'valid-session.jsonl'),
      'LOGIN',
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it('caps results at maxMatches', async () => {
    const matches = await searchSessionFile(
      join(FIXTURES, 'valid-session.jsonl'),
      'the',
      2,
    );
    expect(matches.length).toBeLessThanOrEqual(2);
  });
});
