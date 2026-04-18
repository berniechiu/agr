import { cleanMessageText } from '../../format.js';

export type Recap = {
  lastUserIntent: string | null;
  lastToolAction: string | null;
  lastAssistantText: string | null;
};

const USER_INTENT_MAX = 100;
const ASSISTANT_FALLBACK_MAX = 80;
const BASH_CMD_MAX = 60;
const TASK_DESC_MAX = 40;

function isToolResultContent(content: unknown): boolean {
  if (!Array.isArray(content) || content.length === 0) return false;
  return content.every(
    (item) => typeof item === 'object' && item !== null && (item as Record<string, unknown>).type === 'tool_result',
  );
}

function truncateAtBoundary(text: string, max: number): string {
  const nlIdx = text.indexOf('\n');
  const cut = nlIdx >= 0 ? text.slice(0, nlIdx) : text;
  return cut.slice(0, max);
}

function truncateWithEllipsis(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

function firstLineSlice(text: string, max: number): string {
  return truncateAtBoundary(text, max).trimEnd();
}

function findLastUserIntent(lines: unknown[]): string | null {
  let compactFallback: string | null = null;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line || typeof line !== 'object') continue;
    const entry = line as Record<string, unknown>;
    if (entry.type !== 'user') continue;
    if (entry.isMeta === true) continue;
    const message = entry.message as Record<string, unknown> | undefined;
    if (!message) continue;
    const content = message.content;
    if (isToolResultContent(content)) continue;
    if (typeof content !== 'string') continue;
    const cleaned = cleanMessageText(content);
    if (cleaned.length === 0) continue;

    const text = firstLineSlice(cleaned, USER_INTENT_MAX);
    if (text.length === 0) continue;

    if (entry.isCompactSummary === true) {
      if (compactFallback === null) compactFallback = text;
      continue;
    }
    return text;
  }
  return compactFallback;
}

function renderToolAction(name: string, input: Record<string, unknown>): string | null {
  if (name === 'Edit' || name === 'MultiEdit') {
    const p = input.file_path;
    return typeof p === 'string' ? `Edited ${p}` : null;
  }
  if (name === 'Write') {
    const p = input.file_path;
    return typeof p === 'string' ? `Wrote ${p}` : null;
  }
  if (name === 'NotebookEdit') {
    const p = input.notebook_path;
    return typeof p === 'string' ? `Edited ${p}` : null;
  }
  if (name === 'Bash') {
    const cmd = input.command;
    if (typeof cmd !== 'string') return null;
    return `Ran: ${truncateWithEllipsis(cmd, BASH_CMD_MAX)}`;
  }
  if (name === 'Task') {
    const desc = input.description;
    if (typeof desc !== 'string') return null;
    return `Delegated to agent: ${truncateWithEllipsis(desc, TASK_DESC_MAX)}`;
  }
  return null;
}

function findLastToolAction(lines: unknown[]): string | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line || typeof line !== 'object') continue;
    const entry = line as Record<string, unknown>;
    if (entry.type !== 'assistant') continue;
    const message = entry.message as Record<string, unknown> | undefined;
    const content = message?.content;
    if (!Array.isArray(content)) continue;

    for (let j = 0; j < content.length; j++) {
      const block = content[j];
      if (!block || typeof block !== 'object') continue;
      const b = block as Record<string, unknown>;
      if (b.type !== 'tool_use') continue;
      const name = typeof b.name === 'string' ? b.name : '';
      const input = b.input && typeof b.input === 'object' ? b.input as Record<string, unknown> : {};
      const rendered = renderToolAction(name, input);
      if (rendered) return rendered;
    }
  }
  return null;
}

function findLastAssistantText(lines: unknown[]): string | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line || typeof line !== 'object') continue;
    const entry = line as Record<string, unknown>;
    if (entry.type !== 'assistant') continue;
    const message = entry.message as Record<string, unknown> | undefined;
    const content = message?.content;
    if (!Array.isArray(content)) continue;

    for (let j = 0; j < content.length; j++) {
      const block = content[j];
      if (!block || typeof block !== 'object') continue;
      const b = block as Record<string, unknown>;
      if (b.type === 'text' && typeof b.text === 'string' && b.text.trim().length > 0) {
        return b.text.trim().slice(0, ASSISTANT_FALLBACK_MAX);
      }
    }
  }
  return null;
}

export function extractRecap(lines: unknown[]): Recap {
  const lastToolAction = findLastToolAction(lines);
  return {
    lastUserIntent: findLastUserIntent(lines),
    lastToolAction,
    lastAssistantText: lastToolAction ? null : findLastAssistantText(lines),
  };
}
