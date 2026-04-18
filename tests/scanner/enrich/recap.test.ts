import { describe, it, expect } from 'vitest';
import { extractRecap } from '../../../src/scanner/enrich/recap.js';

function userText(text: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { type: 'user', message: { role: 'user', content: text }, ...extra };
}

function userToolResult(): Record<string, unknown> {
  return {
    type: 'user',
    message: {
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: 'x', content: 'ok' }],
    },
  };
}

function assistantText(text: string): Record<string, unknown> {
  return {
    type: 'assistant',
    message: { role: 'assistant', content: [{ type: 'text', text }] },
  };
}

function assistantTool(name: string, input: Record<string, unknown>): Record<string, unknown> {
  return {
    type: 'assistant',
    message: { role: 'assistant', content: [{ type: 'tool_use', name, input }] },
  };
}

describe('extractRecap', () => {
  it('returns all-null for empty input', () => {
    expect(extractRecap([])).toEqual({
      lastUserIntent: null,
      lastToolAction: null,
      lastAssistantText: null,
    });
  });

  it('produces "Edited <path>" for Edit tool', () => {
    const result = extractRecap([
      userText('fix the bug'),
      assistantTool('Edit', { file_path: 'src/a.ts' }),
    ]);
    expect(result.lastUserIntent).toBe('fix the bug');
    expect(result.lastToolAction).toBe('Edited src/a.ts');
  });

  it('produces "Wrote <path>" for Write', () => {
    const result = extractRecap([
      userText('add a file'),
      assistantTool('Write', { file_path: 'src/new.ts' }),
    ]);
    expect(result.lastToolAction).toBe('Wrote src/new.ts');
  });

  it('produces "Ran: <cmd>" for Bash, truncated at 60 chars', () => {
    const long = 'echo "' + 'a'.repeat(80) + '"';
    const result = extractRecap([
      userText('run it'),
      assistantTool('Bash', { command: long }),
    ]);
    expect(result.lastToolAction).toMatch(/^Ran: echo "a+…$/);
    expect(result.lastToolAction!.length).toBeLessThanOrEqual('Ran: '.length + 60 + 1);
  });

  it('produces "Delegated to agent: …" for Task', () => {
    const result = extractRecap([
      userText('delegate'),
      assistantTool('Task', { description: 'go find the flaky test in the picker module' }),
    ]);
    expect(result.lastToolAction).toMatch(/^Delegated to agent: go find the flaky test/);
  });

  it('falls through Read/Glob/Grep to older tool turn', () => {
    const result = extractRecap([
      userText('do stuff'),
      assistantTool('Edit', { file_path: 'a.ts' }),
      assistantTool('Read', { file_path: 'b.ts' }),
      assistantTool('Grep', { pattern: 'foo' }),
    ]);
    expect(result.lastToolAction).toBe('Edited a.ts');
  });

  it('falls back to lastAssistantText when no tool action found', () => {
    const result = extractRecap([
      userText('explain'),
      assistantText('Here is a long explanation of the module structure'),
    ]);
    expect(result.lastToolAction).toBeNull();
    expect(result.lastAssistantText).toContain('Here is a long explanation');
  });

  it('truncates assistant fallback at ~80 chars', () => {
    const long = 'x'.repeat(200);
    const result = extractRecap([userText('q'), assistantText(long)]);
    expect(result.lastAssistantText!.length).toBeLessThanOrEqual(80);
  });

  it('skips tool_result user messages when picking lastUserIntent', () => {
    const result = extractRecap([
      userText('the real prompt'),
      userToolResult(),
      assistantTool('Edit', { file_path: 'a.ts' }),
    ]);
    expect(result.lastUserIntent).toBe('the real prompt');
  });

  it('skips isMeta user messages', () => {
    const result = extractRecap([
      userText('real intent'),
      userText('meta content', { isMeta: true }),
    ]);
    expect(result.lastUserIntent).toBe('real intent');
  });

  it('prefers a real prompt over isCompactSummary messages', () => {
    const result = extractRecap([
      userText('my real ask'),
      userText('summary of yesterday', { isCompactSummary: true }),
    ]);
    expect(result.lastUserIntent).toBe('my real ask');
  });

  it('falls back to isCompactSummary when no real prompt exists', () => {
    const result = extractRecap([
      userText('summary of yesterday', { isCompactSummary: true }),
    ]);
    expect(result.lastUserIntent).toBe('summary of yesterday');
  });

  it('truncates intent at 100 chars (newlines collapsed to spaces by cleanMessageText)', () => {
    const result = extractRecap([
      userText('line one of the intent\nline two should not appear'),
    ]);
    expect(result.lastUserIntent).toBe('line one of the intent line two should not appear');

    const long = 'a'.repeat(200);
    const r2 = extractRecap([userText(long)]);
    expect(r2.lastUserIntent!.length).toBe(100);
  });

  it('reads notebook_path for NotebookEdit', () => {
    const result = extractRecap([
      userText('edit nb'),
      assistantTool('NotebookEdit', { notebook_path: 'nb.ipynb' }),
    ]);
    expect(result.lastToolAction).toBe('Edited nb.ipynb');
  });

  it('strips command XML wrappers from lastUserIntent', () => {
    const result = extractRecap([
      userText('<local-command-stdout>See ya!</local-command-stdout>'),
    ]);
    expect(result.lastUserIntent).toBe('See ya!');
  });

  it('picks the first tool_use within a single turn with multiple tools', () => {
    const result = extractRecap([
      {
        type: 'user',
        message: { role: 'user', content: 'do two things' },
      },
      {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            { type: 'tool_use', name: 'Edit', input: { file_path: 'a.ts' } },
            { type: 'tool_use', name: 'Bash', input: { command: 'ls' } },
          ],
        },
      },
    ]);
    expect(result.lastToolAction).toBe('Edited a.ts');
  });
});
