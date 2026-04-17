export const UUID_JSONL_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/;

export interface SessionMeta {
  id: string;
  projectName: string;
  cwd: string;
  gitBranch?: string;
  title: string;
  baseTitle: string;
  firstPrompt: string;
  firstTimestamp: number;
  lastTimestamp: number;
  messageCount: number;
  filePath: string;
  tags: string[];
  isActive: boolean;
}

export interface TagStore {
  [sessionId: string]: string[];
}

export interface TitleStore {
  [sessionId: string]: string;
}

export interface ActiveSession {
  pid: number;
  sessionId: string;
  cwd: string;
  startedAt: number;
}
