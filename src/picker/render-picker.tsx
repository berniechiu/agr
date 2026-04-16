import React from 'react';
import { render } from 'ink';
import { SessionPicker, type PickerResult } from './SessionPicker.js';
import type { SessionMeta } from '../types.js';

export async function renderPicker(
  sessions: SessionMeta[],
  totalProjects: number,
  allSessions?: SessionMeta[],
): Promise<PickerResult | null> {
  if (sessions.length === 0) return null;
  if (!process.stdin.isTTY) return null;

  let result: PickerResult | null = null;

  const app = render(
    <SessionPicker
      sessions={sessions}
      totalProjects={totalProjects}
      allSessions={allSessions}
      onSelect={(r) => { result = r; }}
    />,
  );

  await app.waitUntilExit();
  return result;
}
