export type FilesTouched = {
  total: number;
  top: Array<{ path: string; edits: number }>;
};

const EDIT_TOOL_NAMES = new Set(['Edit', 'Write', 'MultiEdit']);

function pathOf(name: string, input: Record<string, unknown>): string | null {
  if (name === 'NotebookEdit') {
    const p = input.notebook_path;
    return typeof p === 'string' && p.length > 0 ? p : null;
  }
  if (EDIT_TOOL_NAMES.has(name)) {
    const p = input.file_path;
    return typeof p === 'string' && p.length > 0 ? p : null;
  }
  return null;
}

export function extractFilesTouched(lines: unknown[]): FilesTouched {
  const counts = new Map<string, number>();
  const firstSeen = new Map<string, number>();
  let order = 0;

  for (const line of lines) {
    if (!line || typeof line !== 'object') continue;
    const entry = line as Record<string, unknown>;
    if (entry.type !== 'assistant') continue;
    const message = entry.message;
    if (!message || typeof message !== 'object') continue;
    const content = (message as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;

    for (const item of content) {
      if (!item || typeof item !== 'object') continue;
      const block = item as Record<string, unknown>;
      if (block.type !== 'tool_use') continue;
      const name = typeof block.name === 'string' ? block.name : '';
      const input = block.input && typeof block.input === 'object'
        ? (block.input as Record<string, unknown>)
        : null;
      if (!input) continue;
      const path = pathOf(name, input);
      if (!path) continue;
      counts.set(path, (counts.get(path) ?? 0) + 1);
      if (!firstSeen.has(path)) firstSeen.set(path, order++);
    }
  }

  const entries = Array.from(counts.entries()).map(([path, edits]) => ({
    path,
    edits,
    order: firstSeen.get(path) ?? 0,
  }));

  entries.sort((a, b) => {
    if (b.edits !== a.edits) return b.edits - a.edits;
    return a.order - b.order;
  });

  return {
    total: entries.length,
    top: entries.slice(0, 3).map(({ path, edits }) => ({ path, edits })),
  };
}
