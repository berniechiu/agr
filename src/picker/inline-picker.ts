import { createInterface, emitKeypressEvents } from 'node:readline';
import pc from 'picocolors';
import type { SessionMeta } from '../types.js';
import { addTag, removeTag, loadTagStore } from '../tags/tag-store.js';
import { formatSessionRow, formatStatusBar } from '../format.js';

const MAX_VISIBLE = 20;

interface PickerResult {
  session: SessionMeta;
}

function prompt(message: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function refreshTags(sessions: SessionMeta[]): void {
  const store = loadTagStore();
  for (const s of sessions) {
    s.tags = store[s.id] ?? [];
  }
}

export async function inlinePicker(
  sessions: SessionMeta[],
  totalProjects: number,
  allSessions?: SessionMeta[],
): Promise<PickerResult | null> {
  if (sessions.length === 0) return null;

  const searchPool = allSessions ?? sessions;
  let filter = '';
  let selectedIndex = 0;
  let filtered = sessions;

  function applyFilter(): void {
    if (filter === '') {
      filtered = sessions;
    } else {
      const lower = filter.toLowerCase();
      filtered = searchPool.filter((s) => {
        const searchable = [
          s.projectName,
          s.title,
          s.firstPrompt,
          s.gitBranch ?? '',
          ...s.tags,
        ].join(' ').toLowerCase();
        return searchable.includes(lower);
      });
    }
    selectedIndex = Math.min(selectedIndex, Math.max(0, filtered.length - 1));
  }

  let lastLineCount = 0;

  function clipToWidth(line: string): string {
    const cols = process.stdout.columns || 80;
    let visible = 0;
    let i = 0;
    while (i < line.length) {
      if (line[i] === '\x1B') {
        const end = line.indexOf('m', i);
        if (end !== -1) {
          i = end + 1;
          continue;
        }
      }
      visible++;
      if (visible > cols) {
        return line.slice(0, i);
      }
      i++;
    }
    return line;
  }

  function render(): void {
    const visible = filtered.slice(0, MAX_VISIBLE);
    const lines: string[] = [];

    lines.push(`${pc.cyan('>')} ${filter}${pc.dim('_')}`);
    lines.push('');

    for (let i = 0; i < visible.length; i++) {
      lines.push(formatSessionRow(visible[i], i === selectedIndex));
    }

    lines.push('');
    lines.push(formatStatusBar(sessions.length, totalProjects));

    if (lastLineCount > 0) {
      process.stdout.write(`\x1B[${lastLineCount}A\x1B[0J`);
    }

    const clipped = lines.map(clipToWidth);
    process.stdout.write(clipped.join('\n') + '\n');
    lastLineCount = clipped.length;
  }

  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve(null);
      return;
    }

    emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    render();

    function cleanup(): void {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('keypress', onKeypress);
    }

    function enterPromptMode(): void {
      process.stdin.removeListener('keypress', onKeypress);
      process.stdin.setRawMode(false);
    }

    function exitPromptMode(): void {
      emitKeypressEvents(process.stdin);
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('keypress', onKeypress);
    }

    function clearAndRerender(): void {
      // Move up enough to cover picker + any prompt lines, then clear
      const rows = process.stdout.rows || 50;
      process.stdout.write(`\x1B[${rows}A\x1B[0J`);
      lastLineCount = 0;
      render();
    }

    async function handleTag(): Promise<void> {
      const session = filtered[selectedIndex];
      enterPromptMode();
      const tag = await prompt(`${pc.cyan('Tag name:')} `);
      if (tag) {
        addTag(session.id, tag);
        refreshTags(allSessions ? [...sessions, ...searchPool] : sessions);
      }
      exitPromptMode();
      clearAndRerender();
    }

    async function handleUntag(): Promise<void> {
      const session = filtered[selectedIndex];
      if (session.tags.length === 0) {
        return;
      }
      enterPromptMode();
      console.log(`Tags on ${pc.cyan(session.id.slice(0, 8))}:`);
      for (let i = 0; i < session.tags.length; i++) {
        console.log(`  ${pc.dim(`${i + 1}.`)} ${pc.yellow(session.tags[i])}`);
      }
      const input = await prompt(`${pc.cyan('Remove which tag (number or name):')} `);
      if (input) {
        const num = parseInt(input, 10);
        const tag = num >= 1 && num <= session.tags.length
          ? session.tags[num - 1]
          : session.tags.find((t) => t.toLowerCase() === input.toLowerCase());
        if (tag) {
          removeTag(session.id, tag);
          refreshTags(allSessions ? [...sessions, ...searchPool] : sessions);
        }
      }
      exitPromptMode();
      clearAndRerender();
    }

    function onKeypress(_ch: string | undefined, key: { name?: string; ctrl?: boolean; sequence?: string } | undefined): void {
      if (!key) return;

      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(0);
      }

      if (key.name === 'escape') {
        if (filter.length > 0) {
          filter = '';
          applyFilter();
          render();
        } else {
          cleanup();
          resolve(null);
        }
        return;
      }

      if (key.name === 'return') {
        cleanup();
        if (filtered.length > 0) {
          resolve({ session: filtered[selectedIndex] });
        } else {
          resolve(null);
        }
        return;
      }

      if (key.sequence === 't' && filter === '' && filtered.length > 0) {
        handleTag();
        return;
      }

      if (key.sequence === 'u' && filter === '' && filtered.length > 0) {
        handleUntag();
        return;
      }

      if (key.name === 'up') {
        selectedIndex = Math.max(0, selectedIndex - 1);
        render();
        return;
      }

      if (key.name === 'down') {
        selectedIndex = Math.min(filtered.length - 1, selectedIndex + 1);
        render();
        return;
      }

      if (key.name === 'backspace') {
        if (filter.length > 0) {
          filter = filter.slice(0, -1);
          applyFilter();
          render();
        }
        return;
      }

      // Regular character input
      if (key.sequence && key.sequence.length === 1 && key.sequence >= ' ') {
        filter += key.sequence;
        applyFilter();
        render();
      }
    }

    process.stdin.on('keypress', onKeypress);
  });
}
