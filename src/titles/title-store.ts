import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { getTitleStorePath } from '../config.js';
import type { TitleStore } from '../types.js';

export function loadTitleStore(): TitleStore {
  const path = getTitleStorePath();
  let content: string;
  try {
    content = readFileSync(path, 'utf8');
  } catch {
    return {};
  }

  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as TitleStore;
    }
    return {};
  } catch {
    try { renameSync(path, path + '.bak'); } catch { /* backup is best-effort */ }
    return {};
  }
}

export function saveTitleStore(store: TitleStore): void {
  const path = getTitleStorePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(store, null, 2) + '\n');
}

export function setTitle(sessionId: string, title: string): void {
  const trimmed = title.trim();
  const store = loadTitleStore();
  if (trimmed.length === 0) {
    delete store[sessionId];
  } else {
    store[sessionId] = trimmed;
  }
  saveTitleStore(store);
}

export function clearTitle(sessionId: string): void {
  const store = loadTitleStore();
  if (!(sessionId in store)) return;
  delete store[sessionId];
  saveTitleStore(store);
}

export function pruneOrphanedTitles(validIds: Set<string>): number {
  const store = loadTitleStore();
  let pruned = 0;
  for (const id of Object.keys(store)) {
    if (!validIds.has(id)) {
      delete store[id];
      pruned++;
    }
  }
  saveTitleStore(store);
  return pruned;
}
