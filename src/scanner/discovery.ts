import { readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { getProjectsDir } from '../config.js';
import { parseSessionFile } from './parser.js';
import { getActiveSessions } from './active.js';
import { loadTagStore } from '../tags/tag-store.js';
import { loadTitleStore } from '../titles/title-store.js';
import { UUID_JSONL_REGEX, type SessionMeta } from '../types.js';

function getCurrentBranch(): string {
  try {
    return execSync('git branch --show-current', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

export async function discoverSessions(): Promise<SessionMeta[]> {
  const projectsDir = getProjectsDir();
  const currentDir = process.cwd();
  const currentBranch = getCurrentBranch();

  let projectDirs: string[];
  try {
    projectDirs = readdirSync(projectsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }

  const activeSessions = getActiveSessions();
  const tagStore = loadTagStore();
  const titleStore = loadTitleStore();
  const sessions: SessionMeta[] = [];

  for (const projectDir of projectDirs) {
    const projectPath = join(projectsDir, projectDir);

    let files: string[];
    try {
      files = readdirSync(projectPath).filter((f) => UUID_JSONL_REGEX.test(f));
    } catch {
      continue;
    }

    for (const file of files) {
      const sessionId = file.replace('.jsonl', '');
      const filePath = join(projectPath, file);

      const meta = await parseSessionFile(filePath, sessionId);
      if (!meta) continue;

      meta.isActive = activeSessions.has(sessionId);
      meta.tags = tagStore[sessionId] ?? [];
      const override = titleStore[sessionId];
      if (override) meta.title = override;
      sessions.push(meta);
    }
  }

  sessions.sort((a, b) => {
    const aLocal = a.cwd === currentDir;
    const bLocal = b.cwd === currentDir;
    if (aLocal !== bLocal) return aLocal ? -1 : 1;

    if (currentBranch) {
      const aBranch = a.gitBranch === currentBranch;
      const bBranch = b.gitBranch === currentBranch;
      if (aBranch !== bBranch) return aBranch ? -1 : 1;
    }

    return b.lastTimestamp - a.lastTimestamp;
  });
  return sessions;
}
