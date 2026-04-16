import { execFileSync } from 'node:child_process';
import type { SessionMeta } from './types.js';

export function resumeSession(session: SessionMeta): void {
  try {
    execFileSync('claude', ['--resume', session.id], {
      stdio: 'inherit',
      cwd: session.cwd || process.cwd(),
    });
  } catch {
    // claude exited — this is normal
  }
}
