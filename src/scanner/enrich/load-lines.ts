import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

export async function loadSessionLines(filePath: string): Promise<unknown[]> {
  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  const out: unknown[] = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      // Skip malformed lines, matching parser.ts behavior.
    }
  }
  return out;
}
