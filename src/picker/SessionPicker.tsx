import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { SessionMeta } from '../types.js';
import { addTag, removeTag, loadTagStore } from '../tags/tag-store.js';
import { truncate, formatDate, cleanMessageText, isMeaningfulBranch } from '../format.js';
import { SessionPreview } from './SessionPreview.js';

const MAX_VISIBLE = 14;

if (typeof process.stdout.setMaxListeners === 'function') {
  process.stdout.setMaxListeners(50);
}

const titleCache = new Map<string, string>();
function displayTitle(session: SessionMeta): string {
  const cached = titleCache.get(session.id);
  if (cached !== undefined) return cached;
  const cleaned = cleanMessageText(session.title) || '(untitled)';
  titleCache.set(session.id, cleaned);
  return cleaned;
}

export interface PickerResult {
  session: SessionMeta;
}

interface SessionPickerProps {
  sessions: SessionMeta[];
  allSessions?: SessionMeta[];
  onSelect: (result: PickerResult | null) => void;
}

type Mode = 'browse' | 'tagging' | 'untagging' | 'preview';

const PROJECT_WIDTH = 14;
const TITLE_WIDTH = 48;
const CARET_WIDTH = 2;
const ACTIVE_WIDTH = 2;
const BRANCH_INDENT = CARET_WIDTH + ACTIVE_WIDTH + PROJECT_WIDTH + 1;

function SessionRow({ session, isSelected }: { session: SessionMeta; isSelected: boolean }) {
  const project = truncate(session.projectName || '—', PROJECT_WIDTH).padEnd(PROJECT_WIDTH);
  const title = truncate(displayTitle(session), TITLE_WIDTH).padEnd(TITLE_WIDTH);
  const date = formatDate(session.lastTimestamp).padStart(5);
  const msgs = `${session.messageCount} msgs`.padStart(8);
  const branchLabel = isMeaningfulBranch(session.gitBranch)
    ? truncate(session.gitBranch, TITLE_WIDTH)
    : null;

  return (
    <Box flexDirection="column">
      <Box>
        <Box width={CARET_WIDTH}>
          <Text color="cyan">{isSelected ? '❯ ' : '  '}</Text>
        </Box>
        <Box width={ACTIVE_WIDTH}>
          {session.isActive ? <Text color="green">● </Text> : <Text>  </Text>}
        </Box>
        <Box width={PROJECT_WIDTH + 1}>
          <Text color="cyan">{project}</Text>
        </Box>
        <Box width={TITLE_WIDTH + 1}>
          <Text bold={isSelected}>{title}</Text>
        </Box>
        <Box width={6}>
          <Text dimColor>{date}</Text>
        </Box>
        <Box width={9}>
          <Text dimColor>{msgs}</Text>
        </Box>
        {session.tags.length > 0 && (
          <Text color="yellow"> {session.tags.map((t) => `#${t}`).join(' ')}</Text>
        )}
      </Box>
      {branchLabel && (
        <Box paddingLeft={BRANCH_INDENT}>
          <Text dimColor>⎇ {branchLabel}</Text>
        </Box>
      )}
    </Box>
  );
}

function TagPrompt({ session, onDone }: { session: SessionMeta; onDone: () => void }) {
  const [input, setInput] = useState('');

  useInput((ch, key) => {
    if (key.return) {
      if (input.length > 0) {
        addTag(session.id, input);
      }
      onDone();
      return;
    }
    if (key.escape) {
      onDone();
      return;
    }
    if (key.backspace) {
      setInput((prev) => prev.slice(0, -1));
      return;
    }
    if (ch && ch.length === 1 && ch >= ' ') {
      setInput((prev) => prev + ch);
    }
  });

  return (
    <Box>
      <Text color="cyan">Tag name: </Text>
      <Text>{input}</Text>
      <Text dimColor>_</Text>
    </Box>
  );
}

function UntagPrompt({ session, onDone }: { session: SessionMeta; onDone: () => void }) {
  const [input, setInput] = useState('');

  useInput((ch, key) => {
    if (key.return) {
      if (input.length > 0) {
        const num = parseInt(input, 10);
        const tag = num >= 1 && num <= session.tags.length
          ? session.tags[num - 1]
          : session.tags.find((t) => t.toLowerCase() === input.toLowerCase());
        if (tag) {
          removeTag(session.id, tag);
        }
      }
      onDone();
      return;
    }
    if (key.escape) {
      onDone();
      return;
    }
    if (key.backspace) {
      setInput((prev) => prev.slice(0, -1));
      return;
    }
    if (ch && ch.length === 1 && ch >= ' ') {
      setInput((prev) => prev + ch);
    }
  });

  return (
    <Box flexDirection="column">
      <Text>Tags on <Text color="cyan">{session.id.slice(0, 8)}</Text>:</Text>
      {session.tags.map((tag, i) => (
        <Text key={tag}>  <Text dimColor>{i + 1}.</Text> <Text color="yellow">{tag}</Text></Text>
      ))}
      <Box>
        <Text color="cyan">Remove which tag (number or name): </Text>
        <Text>{input}</Text>
        <Text dimColor>_</Text>
      </Box>
    </Box>
  );
}

function useTerminalWidth(): number {
  const [cols, setCols] = useState(process.stdout.columns || 80);
  useEffect(() => {
    const onResize = () => setCols(process.stdout.columns || 80);
    process.stdout.on('resize', onResize);
    return () => { process.stdout.off('resize', onResize); };
  }, []);
  return cols;
}

export function SessionPicker({ sessions, allSessions, onSelect }: SessionPickerProps) {
  const { exit } = useApp();
  const searchPool = allSessions ?? sessions;
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<Mode>('browse');
  const [sessionList, setSessionList] = useState(sessions);
  const termCols = useTerminalWidth();

  const filtered = filter === ''
    ? sessionList
    : searchPool.filter((s) => {
        const lower = filter.toLowerCase();
        const searchable = [
          s.projectName,
          s.title,
          s.firstPrompt,
          s.gitBranch ?? '',
          ...s.tags,
        ].join(' ').toLowerCase();
        return searchable.includes(lower);
      });

  const visible = filtered.slice(0, MAX_VISIBLE);
  const clampedIndex = Math.min(selectedIndex, Math.max(0, filtered.length - 1));

  const refreshTags = useCallback(() => {
    const store = loadTagStore();
    const updated = sessionList.map((s) => ({
      ...s,
      tags: store[s.id] ?? [],
    }));
    setSessionList(updated);
  }, [sessionList]);

  const handleTagDone = useCallback(() => {
    refreshTags();
    setMode('browse');
  }, [refreshTags]);

  useInput((ch, key) => {
    if (mode !== 'browse') return;

    if (key.escape) {
      if (filter.length > 0) {
        setFilter('');
        setSelectedIndex(0);
      } else {
        onSelect(null);
        exit();
      }
      return;
    }

    if (key.return) {
      if (filtered.length > 0) {
        onSelect({ session: filtered[clampedIndex] });
        exit();
      } else {
        onSelect(null);
        exit();
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(filtered.length - 1, prev + 1));
      return;
    }

    if (key.backspace) {
      setFilter((prev) => prev.slice(0, -1));
      setSelectedIndex(0);
      return;
    }

    if (key.ctrl && ch === 't' && filtered.length > 0) {
      setMode('tagging');
      return;
    }

    if (key.ctrl && ch === 'u' && filtered.length > 0) {
      const session = filtered[clampedIndex];
      if (session.tags.length > 0) {
        setMode('untagging');
      }
      return;
    }

    if (ch === ' ' && filter === '' && filtered.length > 0) {
      setMode('preview');
      return;
    }

    if (ch && ch.length === 1 && ch >= ' ' && !key.ctrl && !key.meta) {
      setFilter((prev) => prev + ch);
      setSelectedIndex(0);
    }
  });

  const currentSession = filtered.length > 0 ? filtered[clampedIndex] : null;

  if (mode === 'tagging' && currentSession) {
    return <TagPrompt session={currentSession} onDone={handleTagDone} />;
  }

  if (mode === 'untagging' && currentSession) {
    return <UntagPrompt session={currentSession} onDone={handleTagDone} />;
  }

  if (mode === 'preview' && currentSession) {
    return (
      <PreviewView
        session={currentSession}
        width={termCols}
        onDone={() => setMode('browse')}
      />
    );
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan">&gt; </Text>
        <Text>{filter}</Text>
        <Text dimColor>_</Text>
      </Box>
      <Text> </Text>

      {visible.map((session, i) => (
        <SessionRow
          key={session.id}
          session={session}
          isSelected={i === clampedIndex}
        />
      ))}

      <Text> </Text>
      <Text dimColor>
        ↑↓ navigate · type to filter · ⎵ preview · ⏎ resume · ^T tag · ^U untag
      </Text>
    </Box>
  );
}

function PreviewView({
  session,
  width,
  onDone,
}: {
  session: SessionMeta;
  width: number;
  onDone: () => void;
}) {
  useInput((_ch, key) => {
    if (key.escape || key.return) {
      onDone();
    }
  });

  return (
    <Box flexDirection="column">
      <SessionPreview session={session} width={width} />
      <Text> </Text>
      <Text dimColor>Esc/⏎ back to list</Text>
    </Box>
  );
}
