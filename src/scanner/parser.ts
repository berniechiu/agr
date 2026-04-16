import { createReadStream, openSync, readSync, statSync, closeSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { basename } from 'node:path';
import type { SessionMeta } from '../types.js';

const MAX_TITLE_LENGTH = 80;

function toEpoch(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return new Date(value).getTime();
  return 0;
}

function isToolResultMessage(message: unknown): boolean {
  if (!message || typeof message !== 'object') return false;
  const msg = message as Record<string, unknown>;
  const content = msg.content;
  if (!Array.isArray(content)) return false;
  return content.length > 0 && content.every(
    (item) => typeof item === 'object' && item !== null && (item as Record<string, unknown>).type === 'tool_result',
  );
}

function extractFirstPromptText(message: unknown): string | null {
  if (!message || typeof message !== 'object') return null;
  const msg = message as Record<string, unknown>;
  const content = msg.content;
  if (typeof content === 'string' && content.length > 0) {
    const oneLine = content.replace(/\s+/g, ' ').trim();
    if (oneLine.length === 0) return null;
    return oneLine.slice(0, MAX_TITLE_LENGTH);
  }
  return null;
}

function readLastBytes(filePath: string, byteCount: number): string {
  const stat = statSync(filePath);
  const size = stat.size;
  if (size === 0) return '';
  const readSize = Math.min(byteCount, size);
  const buffer = Buffer.alloc(readSize);
  const fd = openSync(filePath, 'r');
  try {
    readSync(fd, buffer, 0, readSize, size - readSize);
    const raw = buffer.toString('utf8');
    if (readSize < size) {
      const firstNewline = raw.indexOf('\n');
      return firstNewline === -1 ? '' : raw.slice(firstNewline + 1);
    }
    return raw;
  } finally {
    closeSync(fd);
  }
}

export async function parseSessionFile(
  filePath: string,
  sessionId: string,
): Promise<SessionMeta | null> {
  let cwd = '';
  let gitBranch: string | undefined;
  let firstPrompt = '';
  let customTitle: string | null = null;
  let firstTimestamp = 0;
  let userMessageCount = 0;
  let assistantMessageCount = 0;
  let foundFirstPrompt = false;

  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    let entry: Record<string, unknown>;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    const type = entry.type as string;

    if (type === 'custom-title') {
      customTitle = (entry.customTitle as string) || null;
    }

    if (type === 'user') {
      if (!isToolResultMessage(entry.message)) {
        userMessageCount++;
      }

      if (!cwd && entry.cwd) {
        cwd = entry.cwd as string;
      }
      if (!gitBranch && entry.gitBranch) {
        gitBranch = entry.gitBranch as string;
      }
      if (!foundFirstPrompt) {
        const text = extractFirstPromptText(entry.message);
        if (text) {
          firstPrompt = text;
          foundFirstPrompt = true;
        }
      }
    }

    if (type === 'assistant') {
      assistantMessageCount++;
    }

    if ((type === 'user' || type === 'assistant') && firstTimestamp === 0 && entry.timestamp) {
      firstTimestamp = toEpoch(entry.timestamp);
    }
  }

  const messageCount = userMessageCount + assistantMessageCount;
  if (messageCount === 0) return null;

  let lastTimestamp = firstTimestamp;
  const tailContent = readLastBytes(filePath, 4096);
  const tailLines = tailContent.split('\n').filter(Boolean);
  for (let i = tailLines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(tailLines[i]);
      if (entry.timestamp) {
        lastTimestamp = toEpoch(entry.timestamp);
        break;
      }
    } catch {
      continue;
    }
  }

  const projectName = cwd ? basename(cwd) : '';

  return {
    id: sessionId,
    projectName,
    cwd,
    gitBranch,
    title: customTitle ?? firstPrompt,
    firstPrompt,
    firstTimestamp,
    lastTimestamp,
    messageCount,
    filePath,
    tags: [],
    isActive: false,
  };
}
