import { describe, it, expect } from 'vitest';
import { extractFilesTouched } from '../../../src/scanner/enrich/files.js';

function assistantWithTools(tools: Array<{ name: string; input: Record<string, unknown> }>): Record<string, unknown> {
  return {
    type: 'assistant',
    message: {
      role: 'assistant',
      content: tools.map((t) => ({ type: 'tool_use', name: t.name, input: t.input })),
    },
  };
}

describe('extractFilesTouched', () => {
  it('returns empty result for no lines', () => {
    expect(extractFilesTouched([])).toEqual({ total: 0, top: [] });
  });

  it('counts a single Edit', () => {
    const result = extractFilesTouched([
      assistantWithTools([{ name: 'Edit', input: { file_path: 'src/a.ts' } }]),
    ]);
    expect(result).toEqual({ total: 1, top: [{ path: 'src/a.ts', edits: 1 }] });
  });

  it('counts Write and MultiEdit as 1 edit each', () => {
    const result = extractFilesTouched([
      assistantWithTools([
        { name: 'Write', input: { file_path: 'src/a.ts' } },
        { name: 'MultiEdit', input: { file_path: 'src/b.ts', edits: [{ old: '1' }, { old: '2' }] } },
      ]),
    ]);
    expect(result.total).toBe(2);
    expect(result.top).toEqual([
      { path: 'src/a.ts', edits: 1 },
      { path: 'src/b.ts', edits: 1 },
    ]);
  });

  it('ignores Read, Bash, Grep, Glob, Task', () => {
    const result = extractFilesTouched([
      assistantWithTools([
        { name: 'Read', input: { file_path: 'src/a.ts' } },
        { name: 'Bash', input: { command: 'ls' } },
        { name: 'Grep', input: { pattern: 'foo' } },
        { name: 'Glob', input: { pattern: '*.ts' } },
        { name: 'Task', input: { description: 'go' } },
      ]),
    ]);
    expect(result).toEqual({ total: 0, top: [] });
  });

  it('increments count for repeated edits to the same path', () => {
    const result = extractFilesTouched([
      assistantWithTools([
        { name: 'Edit', input: { file_path: 'src/a.ts' } },
        { name: 'Edit', input: { file_path: 'src/a.ts' } },
        { name: 'Edit', input: { file_path: 'src/a.ts' } },
      ]),
    ]);
    expect(result).toEqual({ total: 1, top: [{ path: 'src/a.ts', edits: 3 }] });
  });

  it('caps top at 3, sorted by edits desc with stable tie-break', () => {
    const result = extractFilesTouched([
      assistantWithTools([
        { name: 'Edit', input: { file_path: 'a.ts' } },
        { name: 'Edit', input: { file_path: 'a.ts' } },
        { name: 'Edit', input: { file_path: 'b.ts' } },
        { name: 'Edit', input: { file_path: 'b.ts' } },
        { name: 'Edit', input: { file_path: 'c.ts' } },
        { name: 'Edit', input: { file_path: 'd.ts' } },
      ]),
    ]);
    expect(result.total).toBe(4);
    expect(result.top).toEqual([
      { path: 'a.ts', edits: 2 },
      { path: 'b.ts', edits: 2 },
      { path: 'c.ts', edits: 1 },
    ]);
  });

  it('reads notebook_path for NotebookEdit', () => {
    const result = extractFilesTouched([
      assistantWithTools([
        { name: 'NotebookEdit', input: { notebook_path: 'nb.ipynb' } },
      ]),
    ]);
    expect(result).toEqual({ total: 1, top: [{ path: 'nb.ipynb', edits: 1 }] });
  });

  it('ignores malformed entries without content array', () => {
    const result = extractFilesTouched([
      { type: 'user' },
      { type: 'assistant', message: { content: 'text not array' } },
      { type: 'assistant', message: { content: [{ type: 'text', text: 'hi' }] } },
    ]);
    expect(result).toEqual({ total: 0, top: [] });
  });

  it('dedupes case-sensitively (README.md and readme.md count separately)', () => {
    const result = extractFilesTouched([
      assistantWithTools([
        { name: 'Edit', input: { file_path: 'README.md' } },
        { name: 'Edit', input: { file_path: 'readme.md' } },
      ]),
    ]);
    expect(result.total).toBe(2);
  });
});
