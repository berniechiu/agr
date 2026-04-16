import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { parseSessionFile } from '../../src/scanner/parser.js';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

describe('parseSessionFile', () => {
  it('extracts metadata from a valid session', async () => {
    const meta = await parseSessionFile(
      join(FIXTURES, 'valid-session.jsonl'),
      'aaaa1111-2222-3333-4444-555566667777',
    );
    expect(meta).not.toBeNull();
    expect(meta!.id).toBe('aaaa1111-2222-3333-4444-555566667777');
    expect(meta!.cwd).toBe('/Users/test/projects/myapp');
    expect(meta!.projectName).toBe('myapp');
    expect(meta!.gitBranch).toBe('main');
    expect(meta!.firstPrompt).toBe('Fix the login bug');
    expect(meta!.title).toBe('Fix the login bug');
    expect(meta!.firstTimestamp).toBe(1700000000000);
    expect(meta!.lastTimestamp).toBe(1700000070000);
    expect(meta!.messageCount).toBe(4);
  });

  it('returns null for empty sessions (no user messages)', async () => {
    const meta = await parseSessionFile(
      join(FIXTURES, 'empty-session.jsonl'),
      'bbbb1111-2222-3333-4444-555566667777',
    );
    expect(meta).toBeNull();
  });

  it('skips malformed lines and still parses valid entries', async () => {
    const meta = await parseSessionFile(
      join(FIXTURES, 'malformed-session.jsonl'),
      'cccc1111-2222-3333-4444-555566667777',
    );
    expect(meta).not.toBeNull();
    expect(meta!.cwd).toBe('/Users/test/projects/broken');
    expect(meta!.firstPrompt).toBe('Hello');
    expect(meta!.messageCount).toBe(1);
  });

  it('handles missing cwd by falling back to empty string', async () => {
    const meta = await parseSessionFile(
      join(FIXTURES, 'no-cwd-session.jsonl'),
      'dddd1111-2222-3333-4444-555566667777',
    );
    expect(meta).not.toBeNull();
    expect(meta!.cwd).toBe('');
    expect(meta!.projectName).toBe('');
    expect(meta!.firstPrompt).toBe('No cwd here');
  });

  it('uses customTitle over firstPrompt for title', async () => {
    const meta = await parseSessionFile(
      join(FIXTURES, 'custom-title-session.jsonl'),
      'eeee1111-2222-3333-4444-555566667777',
    );
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe('My Custom Session');
    expect(meta!.firstPrompt).toBe('Work on feature X');
    expect(meta!.gitBranch).toBe('feature-x');
  });
});
