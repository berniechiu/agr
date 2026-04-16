import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { getTagStorePath } from '../config.js';
import type { TagStore } from '../types.js';

export function loadTagStore(): TagStore {
  const path = getTagStorePath();
  let content: string;
  try {
    content = readFileSync(path, 'utf8');
  } catch {
    return {};
  }

  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as TagStore;
    }
    return {};
  } catch {
    try { renameSync(path, path + '.bak'); } catch { /* backup is best-effort */ }
    return {};
  }
}

export function saveTagStore(store: TagStore): void {
  const path = getTagStorePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(store, null, 2) + '\n');
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
