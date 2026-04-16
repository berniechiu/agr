import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { discoverSessions } from '../../src/scanner/discovery.js';
import { setBaseDir } from '../../src/config.js';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `agr-test-${Date.now()}`);
  mkdirSync(join(testDir, 'projects', '-Users-test-myapp'), { recursive: true });
  mkdirSync(join(testDir, 'sessions'), { recursive: true });
  setBaseDir(testDir);
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('discoverSessions', () => {
  it('finds sessions across project directories', async () => {
    cpSync(
      join(FIXTURES, 'valid-session.jsonl'),
      join(testDir, 'projects', '-Users-test-myapp', 'aaaa1111-2222-3333-4444-555566667777.jsonl'),
    );
    cpSync(
      join(FIXTURES, 'custom-title-session.jsonl'),
      join(testDir, 'projects', '-Users-test-myapp', 'eeee1111-2222-3333-4444-555566667777.jsonl'),
    );

    const sessions = await discoverSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions[0].id).toBeDefined();
    expect(sessions[1].id).toBeDefined();
  });

  it('skips empty sessions', async () => {
    cpSync(
      join(FIXTURES, 'empty-session.jsonl'),
      join(testDir, 'projects', '-Users-test-myapp', 'bbbb1111-2222-3333-4444-555566667777.jsonl'),
    );
    cpSync(
      join(FIXTURES, 'valid-session.jsonl'),
      join(testDir, 'projects', '-Users-test-myapp', 'aaaa1111-2222-3333-4444-555566667777.jsonl'),
    );

    const sessions = await discoverSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('aaaa1111-2222-3333-4444-555566667777');
  });

  it('sorts sessions by lastTimestamp descending', async () => {
    cpSync(
      join(FIXTURES, 'valid-session.jsonl'),
      join(testDir, 'projects', '-Users-test-myapp', 'aaaa1111-2222-3333-4444-555566667777.jsonl'),
    );
    cpSync(
      join(FIXTURES, 'custom-title-session.jsonl'),
      join(testDir, 'projects', '-Users-test-myapp', 'eeee1111-2222-3333-4444-555566667777.jsonl'),
    );

    const sessions = await discoverSessions();
    expect(sessions[0].lastTimestamp).toBeGreaterThanOrEqual(sessions[1].lastTimestamp);
  });

  it('returns empty array when projects dir is missing', async () => {
    rmSync(join(testDir, 'projects'), { recursive: true, force: true });
    const sessions = await discoverSessions();
    expect(sessions).toEqual([]);
  });
});
