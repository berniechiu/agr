import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setBaseDir } from '../../src/config.js';
import {
  loadTagStore,
  saveTagStore,
  addTag,
  removeTag,
  resolveSessionId,
  pruneOrphanedTags,
} from '../../src/tags/tag-store.js';

let testDir: string;
let agrDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `agr-tags-test-${Date.now()}`);
  agrDir = join(testDir, 'agr');
  mkdirSync(agrDir, { recursive: true });
  setBaseDir(testDir);
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('loadTagStore', () => {
  it('returns empty object when file does not exist', () => {
    expect(loadTagStore()).toEqual({});
  });

  it('loads valid JSON file', () => {
    const store = { 'abc-123': ['tag1'] };
    writeFileSync(join(agrDir, 'tags.json'), JSON.stringify(store));
    expect(loadTagStore()).toEqual(store);
  });

  it('returns empty object and backs up corrupted file', () => {
    writeFileSync(join(agrDir, 'tags.json'), 'not json!!!');
    expect(loadTagStore()).toEqual({});
    expect(existsSync(join(agrDir, 'tags.json.bak'))).toBe(true);
  });
});

describe('addTag', () => {
  it('adds a tag to a session', () => {
    addTag('abc-123', 'my tag');
    const store = loadTagStore();
    expect(store['abc-123']).toEqual(['my tag']);
  });

  it('does not duplicate existing tags', () => {
    addTag('abc-123', 'my tag');
    addTag('abc-123', 'my tag');
    const store = loadTagStore();
    expect(store['abc-123']).toEqual(['my tag']);
  });

  it('supports multiple tags per session', () => {
    addTag('abc-123', 'tag1');
    addTag('abc-123', 'tag2');
    const store = loadTagStore();
    expect(store['abc-123']).toEqual(['tag1', 'tag2']);
  });
});

describe('removeTag', () => {
  it('removes a tag from a session', () => {
    addTag('abc-123', 'tag1');
    addTag('abc-123', 'tag2');
    removeTag('abc-123', 'tag1');
    const store = loadTagStore();
    expect(store['abc-123']).toEqual(['tag2']);
  });

  it('removes session entry when last tag is removed', () => {
    addTag('abc-123', 'tag1');
    removeTag('abc-123', 'tag1');
    const store = loadTagStore();
    expect(store['abc-123']).toBeUndefined();
  });
});

describe('resolveSessionId', () => {
  it('resolves a full UUID', () => {
    const ids = ['aaaa1111-2222-3333-4444-555566667777', 'bbbb1111-2222-3333-4444-555566667777'];
    expect(resolveSessionId('aaaa1111-2222-3333-4444-555566667777', ids)).toBe('aaaa1111-2222-3333-4444-555566667777');
  });

  it('resolves a UUID prefix (8+ chars)', () => {
    const ids = ['aaaa1111-2222-3333-4444-555566667777', 'bbbb1111-2222-3333-4444-555566667777'];
    expect(resolveSessionId('aaaa1111', ids)).toBe('aaaa1111-2222-3333-4444-555566667777');
  });

  it('returns null for ambiguous prefix', () => {
    const ids = ['aaaa1111-2222-3333-4444-555566667777', 'aaaa1111-9999-8888-7777-666655554444'];
    expect(resolveSessionId('aaaa1111', ids)).toBeNull();
  });

  it('returns null for no match', () => {
    const ids = ['aaaa1111-2222-3333-4444-555566667777'];
    expect(resolveSessionId('zzzz', ids)).toBeNull();
  });
});

describe('pruneOrphanedTags', () => {
  it('removes tags for session IDs not in the valid set', () => {
    addTag('valid-id', 'tag1');
    addTag('orphan-id', 'tag2');
    const pruned = pruneOrphanedTags(new Set(['valid-id']));
    expect(pruned).toBe(1);
    const store = loadTagStore();
    expect(store['valid-id']).toEqual(['tag1']);
    expect(store['orphan-id']).toBeUndefined();
  });
});
