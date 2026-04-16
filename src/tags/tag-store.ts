import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { getTagStorePath } from '../config.js';
import type { TagStore } from '../types.js';

export function loadTagStore(): TagStore {
  const path = getTagStorePath();
  try {
    const content = readFileSync(path, 'utf8');
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as TagStore;
    }
    return {};
  } catch (err) {
    if (existsSync(path)) {
      try {
        renameSync(path, path + '.bak');
      } catch {
        // ignore backup failure
      }
    }
    return {};
  }
}

export function saveTagStore(store: TagStore): void {
  writeFileSync(getTagStorePath(), JSON.stringify(store, null, 2) + '\n');
}

export function addTag(sessionId: string, tag: string): void {
  const store = loadTagStore();
  if (!store[sessionId]) {
    store[sessionId] = [];
  }
  if (!store[sessionId].includes(tag)) {
    store[sessionId].push(tag);
  }
  saveTagStore(store);
}

export function removeTag(sessionId: string, tag: string): void {
  const store = loadTagStore();
  if (!store[sessionId]) return;
  store[sessionId] = store[sessionId].filter((t) => t !== tag);
  if (store[sessionId].length === 0) {
    delete store[sessionId];
  }
  saveTagStore(store);
}

export function resolveSessionId(prefix: string, allIds: string[]): string | null {
  const matches = allIds.filter((id) => id.startsWith(prefix));
  if (matches.length === 1) return matches[0];
  return null;
}

export function pruneOrphanedTags(validIds: Set<string>): number {
  const store = loadTagStore();
  let pruned = 0;
  for (const id of Object.keys(store)) {
    if (!validIds.has(id)) {
      delete store[id];
      pruned++;
    }
  }
  saveTagStore(store);
  return pruned;
}
