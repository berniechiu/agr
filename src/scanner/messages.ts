import { open, stat } from 'node:fs/promises';

export interface RecentMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

const TAIL_BYTES = 128 * 1024;

function toEpoch(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  }
  return 0;
}

function extractText(message: unknown): string | null {
  if (!message || typeof message !== 'object') return null;
  const msg = message as Record<string, unknown>;
  const content = msg.content;

  if (typeof content === 'string') {
    const trimmed = content.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const item of content) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      if (rec.type === 'text' && typeof rec.text === 'string') {
        parts.push(rec.text);
      } else if (rec.type === 'tool_use' && typeof rec.name === 'string') {
        parts.push(`[tool: ${rec.name}]`);
      } else if (rec.type === 'tool_result') {
        return null;
      }
    }
    const joined = parts.join('\n').trim();
    return joined.length > 0 ? joined : null;
  }

  return null;
}

export async function getRecentMessages(filePath: string, n: number): Promise<RecentMessage[]> {
  const info = await stat(filePath);
  const start = Math.max(0, info.size - TAIL_BYTES);
  const length = info.size - start;
  if (length === 0) return [];

  const fh = await open(filePath, 'r');
  try {
    const buf = Buffer.alloc(length);
    await fh.read(buf, 0, length, start);
    let text = buf.toString('utf8');

    if (start > 0) {
      const firstNewline = text.indexOf('\n');
      if (firstNewline >= 0) text = text.slice(firstNewline + 1);
    }

    const results: RecentMessage[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;
      let entry: Record<string, unknown>;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }

      const type = entry.type;
      if (type !== 'user' && type !== 'assistant') continue;

      const body = extractText(entry.message);
      if (!body) continue;

      results.push({
        role: type,
        text: body,
        timestamp: toEpoch(entry.timestamp),
      });
    }

    return results.slice(-n);
  } finally {
    await fh.close();
  }
}
