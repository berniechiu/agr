import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import type { SessionMeta } from '../types.js';
import { getRecentMessages, type RecentMessage } from '../scanner/messages.js';
import { cleanMessageBlock, formatDateTime, formatDuration, formatRelative, isMeaningfulBranch } from '../format.js';
import { loadSessionLines } from '../scanner/enrich/load-lines.js';
import { extractFilesTouched, type FilesTouched } from '../scanner/enrich/files.js';
import { estimateCost, type CostEstimate } from '../scanner/enrich/cost.js';
import { extractRecap, type Recap } from '../scanner/enrich/recap.js';
import { formatFilesTouched, formatCost } from '../scanner/enrich/format.js';

interface SessionPreviewProps {
  session: SessionMeta;
  width: number;
}

const RECENT_COUNT = 4;
const SNIPPET_LINES = 4;
const MAX_TEXT_WIDTH = 100;
const LABEL_WIDTH = 9;

function wrapText(text: string, maxWidth: number, maxLines: number): string[] {
  if (maxWidth <= 0) return [];
  const out: string[] = [];
  const paragraphs = text.split('\n');
  for (let p = 0; p < paragraphs.length; p++) {
    const para = paragraphs[p];
    if (para.length === 0) {
      out.push('');
      if (out.length >= maxLines) return out;
      continue;
    }
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const word of words) {
      const chunk = word.length > maxWidth ? word.slice(0, maxWidth - 1) + '…' : word;
      if (line.length === 0) {
        line = chunk;
        continue;
      }
      if (line.length + 1 + chunk.length > maxWidth) {
        out.push(line);
        if (out.length >= maxLines) return out;
        line = chunk;
      } else {
        line += ' ' + chunk;
      }
    }
    if (line.length > 0) {
      out.push(line);
      if (out.length >= maxLines) return out;
    }
  }
  return out;
}

function KeyValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Box width={LABEL_WIDTH}>
        <Text dimColor>{label}</Text>
      </Box>
      <Box flexGrow={1}>{children}</Box>
    </Box>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <Box marginTop={1} marginBottom={1}>
      <Text bold color="cyan">{label.toUpperCase()}</Text>
    </Box>
  );
}

function Blockquote({ lines }: { lines: string[] }) {
  return (
    <Box flexDirection="column">
      {lines.map((line, i) => (
        <Box key={i}>
          <Text dimColor>│ </Text>
          <Text>{line}</Text>
        </Box>
      ))}
    </Box>
  );
}

function MessageBlock({ msg, maxWidth }: { msg: RecentMessage; maxWidth: number }) {
  const cleaned = cleanMessageBlock(msg.text) || '(empty)';
  const lines = wrapText(cleaned, maxWidth - 2, SNIPPET_LINES);
  const isUser = msg.role === 'user';
  const roleColor = isUser ? 'cyan' : 'green';
  const roleLabel = isUser ? 'you' : 'assistant';

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={roleColor} bold>{roleLabel}</Text>
        <Text dimColor>  ·  {formatRelative(msg.timestamp)}</Text>
      </Box>
      <Box>
        <Box width={1}>
          <Text color={roleColor}>▎</Text>
        </Box>
        <Box flexDirection="column" paddingLeft={1} flexGrow={1}>
          {lines.map((line, i) => (
            <Text key={i}>{line}</Text>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

export function SessionPreview({ session, width }: SessionPreviewProps) {
  const [messages, setMessages] = useState<RecentMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const contentWidth = Math.min(Math.max(40, width - 6), MAX_TEXT_WIDTH);

  useEffect(() => {
    let cancelled = false;
    setMessages(null);
    setError(null);
    getRecentMessages(session.filePath, RECENT_COUNT)
      .then((msgs) => { if (!cancelled) setMessages(msgs); })
      .catch((e) => { if (!cancelled) setError(String(e.message ?? e)); });
    return () => { cancelled = true; };
  }, [session.filePath]);

  const [enrichment, setEnrichment] = useState<{
    files: FilesTouched;
    cost: CostEstimate;
    recap: Recap;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEnrichment(null);
    loadSessionLines(session.filePath)
      .then((lines) => {
        if (cancelled) return;
        setEnrichment({
          files: extractFilesTouched(lines),
          cost: estimateCost(lines),
          recap: extractRecap(lines),
        });
      })
      .catch(() => { /* silently skip enrichment on load failure */ });
    return () => { cancelled = true; };
  }, [session.filePath]);

  const duration = formatDuration(session.firstTimestamp, session.lastTimestamp);
  const firstPromptClean = cleanMessageBlock(session.firstPrompt || '');
  const firstPromptLines = firstPromptClean.length > 0
    ? wrapText(firstPromptClean, contentWidth - 2, 6)
    : ['(no prompt captured)'];

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1} width={width}>
      <SectionTitle label="Session" />
      <Box flexDirection="column">
        <KeyValue label="project">
          <Box>
            <Text color="cyan" bold>{session.projectName || 'unknown'}</Text>
            {session.isActive && <Text color="green">  ● active</Text>}
          </Box>
        </KeyValue>
        {isMeaningfulBranch(session.gitBranch) && (
          <KeyValue label="branch">
            <Text color="magenta">{session.gitBranch}</Text>
          </KeyValue>
        )}
        <KeyValue label="id">
          <Text dimColor>{session.id}</Text>
        </KeyValue>
        <KeyValue label="started">
          <Text>{formatDateTime(session.firstTimestamp)}</Text>
        </KeyValue>
        <KeyValue label="last">
          <Text>{formatDateTime(session.lastTimestamp)}</Text>
          <Text dimColor>  ({duration})</Text>
        </KeyValue>
        <KeyValue label="messages">
          <Text>{session.messageCount}</Text>
        </KeyValue>
        {session.tags.length > 0 && (
          <KeyValue label="tags">
            <Text color="yellow">{session.tags.map((t) => `#${t}`).join(' ')}</Text>
          </KeyValue>
        )}
        {session.cwd && (
          <KeyValue label="cwd">
            <Text dimColor>{session.cwd}</Text>
          </KeyValue>
        )}
      </Box>

      {enrichment && (
        <>
          <SectionTitle label="Files" />
          <Text>{formatFilesTouched(enrichment.files)}</Text>

          <SectionTitle label="Cost" />
          <Text>{formatCost(enrichment.cost)}</Text>

          {(enrichment.recap.lastUserIntent || enrichment.recap.lastAssistantText) && (
            <>
              <SectionTitle label="Recap" />
              {enrichment.recap.lastUserIntent && (
                <Text>→ {enrichment.recap.lastUserIntent}</Text>
              )}
              {enrichment.recap.lastToolAction && (
                <Text>⚙ {enrichment.recap.lastToolAction}</Text>
              )}
              {!enrichment.recap.lastToolAction && enrichment.recap.lastAssistantText && (
                <Text>← {enrichment.recap.lastAssistantText}…</Text>
              )}
            </>
          )}
        </>
      )}

      <SectionTitle label="First prompt" />
      <Blockquote lines={firstPromptLines} />

      <SectionTitle label="Recent activity" />
      {error && <Text color="red">Failed to load: {error}</Text>}
      {!error && messages === null && <Text dimColor>Loading…</Text>}
      {!error && messages !== null && messages.length === 0 && (
        <Text dimColor>(no recent messages)</Text>
      )}
      {!error && messages !== null && messages.map((msg, i) => (
        <MessageBlock key={i} msg={msg} maxWidth={contentWidth} />
      ))}
    </Box>
  );
}
