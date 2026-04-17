import React from 'react';
import { render } from 'ink';
import { SessionPicker, type PickerResult } from './SessionPicker.js';
import type { SessionMeta } from '../types.js';

export async function renderPicker(
  sessions: SessionMeta[],
  allSessions?: SessionMeta[],
): Promise<PickerResult | null> {
  if (sessions.length === 0) return null;
  if (!process.stdin.isTTY) return null;

  let result: PickerResult | null = null;

  const app = render(
    <SessionPicker
      sessions={sessions}
      allSessions={allSessions}
      onSelect={(r) => { result = r; }}
    />,
  );

  await app.waitUntilExit();
  return result;
}
