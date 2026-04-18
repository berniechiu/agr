import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { extractSnippet } from './snippet.js';

export interface SearchMatch {
  text: string;
  type: 'user' | 'assistant';
  timestamp: number;
  matchSnippet: string;
}

function extractText(entry: Record<string, unknown>): string | null {
  const message = entry.message as Record<string, unknown> | undefined;
  if (!message) return null;

  const content = message.content;
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    const texts: string[] = [];
    for (const item of content) {
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        if (typeof obj.text === 'string') {
          texts.push(obj.text);
        }
      }
    }
    return texts.length > 0 ? texts.join(' ') : null;
  }

  return null;
}

function firstMatchRange(lower: string, words: string[]): { start: number; end: number } | null {
  let earliest: { start: number; end: number } | null = null;
  for (const w of words) {
    const idx = lower.indexOf(w);
    if (idx < 0) return null;
    if (earliest === null || idx < earliest.start) {
      earliest = { start: idx, end: idx + w.length };
    }
  }
  return earliest;
}

export async function searchSessionFile(
  filePath: string,
  query: string,
  maxMatches: number = 50,
): Promise<SearchMatch[]> {
  const matches: SearchMatch[] = [];
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);

  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (matches.length >= maxMatches) break;

    let entry: Record<string, unknown>;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    const type = entry.type as string;
    if (type !== 'user' && type !== 'assistant') continue;

    const text = extractText(entry);
    if (!text) continue;

    const lower = text.toLowerCase();
    if (!words.every((w) => lower.includes(w))) continue;

    const range = firstMatchRange(lower, words);
    if (!range) continue;

    matches.push({
      text: text.slice(0, 200),
      type: type as 'user' | 'assistant',
      timestamp: (entry.timestamp as number) ?? 0,
      matchSnippet: extractSnippet(text, range.start, range.end),
    });
  }

  return matches;
}
