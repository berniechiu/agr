import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

let claudeDir: string | null = null;
let agrDir: string | null = null;

export function setBaseDir(dir: string): void {
  claudeDir = dir;
  agrDir = join(dir, 'agr');
}

export function getClaudeDir(): string {
  return claudeDir ?? join(homedir(), '.claude');
}

export function getAgrDir(): string {
  const dir = agrDir ?? join(homedir(), '.agr');
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function getProjectsDir(): string {
  return join(getClaudeDir(), 'projects');
}

export function getSessionsDir(): string {
  return join(getClaudeDir(), 'sessions');
}

export function getTagStorePath(): string {
  return join(getAgrDir(), 'tags.json');
}
