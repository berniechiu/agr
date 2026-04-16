import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getSessionsDir } from '../config.js';
import type { ActiveSession } from '../types.js';

export function getActiveSessions(): Map<string, ActiveSession> {
  const sessionsDir = getSessionsDir();
  const map = new Map<string, ActiveSession>();

  let files: string[];
  try {
    files = readdirSync(sessionsDir).filter((f) => f.endsWith('.json'));
  } catch {
    return map;
  }

  for (const file of files) {
    try {
      const content = readFileSync(join(sessionsDir, file), 'utf8');
      const data = JSON.parse(content) as ActiveSession;
      if (data.sessionId) {
        map.set(data.sessionId, data);
      }
    } catch {
      continue;
    }
  }

  return map;
}
