import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { basename } from 'node:path';
import type { SessionMeta } from '../types.js';
import { cleanMessageText } from '../format.js';

const MAX_TITLE_LENGTH = 80;

function toEpoch(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  }
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

export async function parseSessionFile(
  filePath: string,
  sessionId: string,
): Promise<SessionMeta | null> {
  let cwd = '';
  let gitBranch: string | undefined;
  let firstPrompt = '';
  let customTitle: string | null = null;
  let firstTimestamp = 0;
  let lastTimestamp = 0;
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
      const raw = typeof entry.customTitle === 'string' ? entry.customTitle : '';
      const cleaned = cleanMessageText(raw);
      customTitle = cleaned.length > 0 ? cleaned : null;
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

    if (entry.timestamp) {
      const ts = toEpoch(entry.timestamp);
      if (firstTimestamp === 0) firstTimestamp = ts;
      lastTimestamp = ts;
    }
  }

  const messageCount = userMessageCount + assistantMessageCount;
  if (messageCount === 0) return null;

  const projectName = cwd ? basename(cwd) : '';

  const baseTitle = customTitle ?? firstPrompt;

  return {
    id: sessionId,
    projectName,
    cwd,
    gitBranch,
    title: baseTitle,
    baseTitle,
    firstPrompt,
    firstTimestamp,
    lastTimestamp,
    messageCount,
    filePath,
    tags: [],
    isActive: false,
  };
}
