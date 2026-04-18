import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { join } from 'node:path';
import { SessionPreview } from '../../src/picker/SessionPreview.js';
import type { SessionMeta } from '../../src/types.js';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

function metaFor(file: string, id: string): SessionMeta {
  return {
    id,
    projectName: 'agr',
    cwd: '/Users/test/projects/agr',
    gitBranch: 'master',
    title: 'Refactor the picker module',
    baseTitle: 'Refactor the picker module',
    firstPrompt: 'Refactor the picker module',
    firstTimestamp: 1700000000000,
    lastTimestamp: 1700000040000,
    messageCount: 5,
    filePath: join(FIXTURES, file),
    tags: [],
    isActive: false,
  };
}

async function waitForLoad(rerender: () => void) {
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 25));
    rerender();
  }
}

describe('SessionPreview', () => {
  it('renders Files, Cost, Recap sections for a rich session', async () => {
    const session = metaFor('rich-session.jsonl', 'ffff1111-2222-3333-4444-555566667777');
    const { lastFrame, rerender } = render(<SessionPreview session={session} width={120} />);
    await waitForLoad(() => rerender(<SessionPreview session={session} width={120} />));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('FILES');
    expect(frame).toContain('src/picker/SessionPicker.tsx');
    expect(frame).toContain('COST');
    expect(frame).toMatch(/\$\d/);
    expect(frame).toContain('RECAP');
    expect(frame).toContain('Refactor the picker module');
    expect(frame).toContain('Ran: npm test');
  });

  it('shows no file edits and uses assistant-text fallback for read-only session', async () => {
    const session = metaFor('readonly-session.jsonl', '1111aaaa-2222-3333-4444-555566667777');
    session.title = 'Just explain the scanner module';
    session.baseTitle = session.title;
    session.firstPrompt = session.title;

    const { lastFrame, rerender } = render(<SessionPreview session={session} width={120} />);
    await waitForLoad(() => rerender(<SessionPreview session={session} width={120} />));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('no file edits');
    expect(frame).toContain('The scanner module parses');
  });
});
