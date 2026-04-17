import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { SessionPicker } from '../../src/picker/SessionPicker.js';
import type { SessionMeta } from '../../src/types.js';

const ARROW_DOWN = '\x1B[B';
const ARROW_UP = '\x1B[A';
const ENTER = '\r';
const ESCAPE = '\x1B';
const BACKSPACE = '\x7F';
const CTRL_T = '\x14';
const CTRL_U = '\x15';

function makeSessions(count: number): SessionMeta[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `aaaa1111-2222-3333-4444-${String(i).padStart(12, '0')}`,
    projectName: `project-${i}`,
    cwd: `/home/user/project-${i}`,
    title: `Session title ${i}`,
    baseTitle: `Session title ${i}`,
    firstPrompt: `First prompt ${i}`,
    firstTimestamp: 1700000000000 + i * 100000,
    lastTimestamp: 1700000070000 + i * 100000,
    messageCount: 4 + i,
    filePath: `/some/path/${i}.jsonl`,
    tags: [],
    isActive: false,
  }));
}

function delay(ms = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function typeChars(stdin: { write: (data: string) => void }, text: string): Promise<void> {
  for (const ch of text) {
    stdin.write(ch);
    await delay();
  }
}

describe('SessionPicker', () => {
  let onSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSelect = vi.fn();
  });

  it('renders session list with filter bar and footer hints', () => {
    const sessions = makeSessions(3);
    const { lastFrame } = render(
      <SessionPicker sessions={sessions} onSelect={onSelect} />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain('>');
    expect(frame).toContain('project-0');
    expect(frame).toContain('project-1');
    expect(frame).toContain('project-2');
    expect(frame).toContain('navigate');
  });

  it('shows selection indicator on first item', () => {
    const sessions = makeSessions(3);
    const { lastFrame } = render(
      <SessionPicker sessions={sessions} onSelect={onSelect} />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain('❯');
  });

  it('navigates down with arrow key', async () => {
    const sessions = makeSessions(3);
    const { lastFrame, stdin } = render(
      <SessionPicker sessions={sessions} onSelect={onSelect} />,
    );

    await delay();
    stdin.write(ARROW_DOWN);
    await delay();

    const frame = lastFrame()!;
    const lines = frame.split('\n');
    const selectedLine = lines.find((l) => l.includes('❯'));
    expect(selectedLine).toContain('project-1');
  });

  it('navigates up with arrow key', async () => {
    const sessions = makeSessions(3);
    const { lastFrame, stdin } = render(
      <SessionPicker sessions={sessions} onSelect={onSelect} />,
    );

    await delay();
    stdin.write(ARROW_DOWN);
    await delay();
    stdin.write(ARROW_DOWN);
    await delay();
    stdin.write(ARROW_UP);
    await delay();

    const frame = lastFrame()!;
    const lines = frame.split('\n');
    const selectedLine = lines.find((l) => l.includes('❯'));
    expect(selectedLine).toContain('project-1');
  });

  it('filters sessions by typing', async () => {
    const sessions = makeSessions(5);
    const { lastFrame, stdin } = render(
      <SessionPicker sessions={sessions} onSelect={onSelect} />,
    );

    await typeChars(stdin, 'project-3');
    await delay();

    const frame = lastFrame()!;
    expect(frame).toContain('project-3');
    expect(frame).not.toContain('project-0');
    expect(frame).not.toContain('project-1');
  });

  it('#<tag> filter scopes to tag matches only', async () => {
    const sessions = makeSessions(4);
    sessions[0].tags = ['sprint-12'];
    sessions[1].tags = ['sprint-13'];
    sessions[2].title = 'mentions sprint in title';
    const { lastFrame, stdin } = render(
      <SessionPicker sessions={sessions} onSelect={onSelect} />,
    );

    await typeChars(stdin, '#sprint');
    await delay();

    const frame = lastFrame()!;
    expect(frame).toContain('project-0');
    expect(frame).toContain('project-1');
    expect(frame).not.toContain('project-2');
    expect(frame).not.toContain('project-3');
  });

  it('bare # filter lists only tagged sessions', async () => {
    const sessions = makeSessions(3);
    sessions[0].tags = ['foo'];
    sessions[2].tags = ['bar'];
    const { lastFrame, stdin } = render(
      <SessionPicker sessions={sessions} onSelect={onSelect} />,
    );

    await typeChars(stdin, '#');
    await delay();

    const frame = lastFrame()!;
    expect(frame).toContain('project-0');
    expect(frame).not.toContain('project-1');
    expect(frame).toContain('project-2');
  });

  it('clears filter on escape', async () => {
    const sessions = makeSessions(3);
    const { lastFrame, stdin } = render(
      <SessionPicker sessions={sessions} onSelect={onSelect} />,
    );

    await typeChars(stdin, 'xyz');
    await delay();
    stdin.write(ESCAPE);
    await delay();

    const frame = lastFrame()!;
    expect(frame).toContain('project-0');
    expect(frame).toContain('project-1');
  });

  it('selects session on enter', async () => {
    const sessions = makeSessions(3);
    const { stdin } = render(
      <SessionPicker sessions={sessions} onSelect={onSelect} />,
    );

    await delay();
    stdin.write(ENTER);
    await delay();

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        session: expect.objectContaining({ projectName: 'project-0' }),
      }),
    );
  });

  it('selects null on escape with no filter', async () => {
    const sessions = makeSessions(3);
    const { stdin } = render(
      <SessionPicker sessions={sessions} onSelect={onSelect} />,
    );

    await delay();
    stdin.write(ESCAPE);
    await delay();

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('handles backspace in filter', async () => {
    const sessions = makeSessions(3);
    const { lastFrame, stdin } = render(
      <SessionPicker sessions={sessions} onSelect={onSelect} />,
    );

    await typeChars(stdin, 'abc');
    await delay();
    stdin.write(BACKSPACE);
    await delay();

    const frame = lastFrame()!;
    expect(frame).toContain('ab');
  });

  it('shows tags on sessions', () => {
    const sessions = makeSessions(1);
    sessions[0].tags = ['important', 'review'];
    const { lastFrame } = render(
      <SessionPicker sessions={sessions} onSelect={onSelect} />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain('#important');
    expect(frame).toContain('#review');
  });

  it('shows active indicator', () => {
    const sessions = makeSessions(1);
    sessions[0].isActive = true;
    const { lastFrame } = render(
      <SessionPicker sessions={sessions} onSelect={onSelect} />,
    );
    const frame = lastFrame()!;
    expect(frame).toContain('●');
  });

  it('enters tag mode on Ctrl+T', async () => {
    const sessions = makeSessions(1);
    const { lastFrame, stdin } = render(
      <SessionPicker sessions={sessions} onSelect={onSelect} />,
    );

    await delay();
    stdin.write(CTRL_T);
    await delay();

    const frame = lastFrame()!;
    expect(frame).toContain('Tag name:');
  });

  it('enters untag mode on Ctrl+U when session has tags', async () => {
    const sessions = makeSessions(1);
    sessions[0].tags = ['mytag'];
    const { lastFrame, stdin } = render(
      <SessionPicker sessions={sessions} onSelect={onSelect} />,
    );

    await delay();
    stdin.write(CTRL_U);
    await delay();

    const frame = lastFrame()!;
    expect(frame).toContain('Remove which tag');
    expect(frame).toContain('mytag');
  });

  it('does not enter untag mode when session has no tags', async () => {
    const sessions = makeSessions(1);
    const { lastFrame, stdin } = render(
      <SessionPicker sessions={sessions} onSelect={onSelect} />,
    );

    await delay();
    stdin.write(CTRL_U);
    await delay();

    const frame = lastFrame()!;
    expect(frame).not.toContain('Remove which tag');
  });
});
