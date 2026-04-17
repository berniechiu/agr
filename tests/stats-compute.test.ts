import { describe, it, expect } from 'vitest';
import { computeStats, sparkline, bar, formatDelta } from '../src/commands/stats-compute.js';
import type { SessionMeta } from '../src/types.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 3, 17, 12, 0, 0).getTime();

function session(daysAgo: number, messageCount = 5, projectName = 'proj-a', overrides: Partial<SessionMeta> = {}): SessionMeta {
  const ts = NOW - daysAgo * DAY_MS;
  return {
    id: `id-${daysAgo}-${projectName}-${messageCount}`,
    projectName,
    cwd: `/tmp/${projectName}`,
    title: 't',
    baseTitle: 't',
    firstPrompt: 'fp',
    firstTimestamp: ts,
    lastTimestamp: ts,
    messageCount,
    filePath: '/tmp/x.jsonl',
    tags: [],
    isActive: false,
    ...overrides,
  };
}

describe('computeStats', () => {
  it('counts this week vs last week and computes delta', () => {
    const sessions = [
      session(1), session(2), session(3),
      session(8), session(10),
    ];
    const s = computeStats(sessions, NOW);
    expect(s.thisWeek).toBe(3);
    expect(s.lastWeek).toBe(2);
    expect(s.weekDeltaPct).toBe(50);
  });

  it('returns null weekDeltaPct when prior week empty and this week nonzero', () => {
    const sessions = [session(1), session(2)];
    const s = computeStats(sessions, NOW);
    expect(s.lastWeek).toBe(0);
    expect(s.weekDeltaPct).toBeNull();
  });

  it('computes current and longest streak', () => {
    const sessions = [
      session(0), session(1), session(2),
      session(5), session(6), session(7), session(8),
    ];
    const s = computeStats(sessions, NOW);
    expect(s.currentStreak).toBe(3);
    expect(s.longestStreak).toBe(4);
  });

  it('currentStreak is 0 when today and yesterday both empty', () => {
    const sessions = [session(2), session(3), session(4)];
    const s = computeStats(sessions, NOW);
    expect(s.currentStreak).toBe(0);
    expect(s.longestStreak).toBe(3);
  });

  it('computes median and longest message counts', () => {
    const sessions = [session(1, 4), session(2, 8), session(3, 15), session(4, 100)];
    const s = computeStats(sessions, NOW);
    expect(s.medianMessages).toBe(12);
    expect(s.longestMessages).toBe(100);
  });

  it('builds 14-day activity window', () => {
    const sessions = [session(0), session(0), session(5), session(13)];
    const s = computeStats(sessions, NOW);
    expect(s.activity14d).toHaveLength(14);
    expect(s.activity14d[13]).toBe(2);
    expect(s.activity14d[8]).toBe(1);
    expect(s.activity14d[0]).toBe(1);
  });

  it('ranks top projects with bar ratios and shares', () => {
    const sessions = [
      ...Array(10).fill(0).map(() => session(1, 5, 'alpha')),
      ...Array(5).fill(0).map(() => session(1, 5, 'beta')),
      ...Array(2).fill(0).map(() => session(1, 5, 'gamma')),
    ];
    const s = computeStats(sessions, NOW);
    expect(s.topProjects[0]).toEqual({ name: 'alpha', count: 10, share: 10 / 17, barRatio: 1 });
    expect(s.topProjects[1].barRatio).toBeCloseTo(0.5);
    expect(s.topProjects).toHaveLength(3);
  });
});

describe('sparkline', () => {
  it('renders empty string for empty input', () => {
    expect(sparkline([])).toBe('');
  });

  it('renders lowest block for all-zero input', () => {
    expect(sparkline([0, 0, 0])).toBe('▁▁▁');
  });

  it('renders blank for zero within a nonzero series', () => {
    expect(sparkline([1, 0, 4])).toMatch(/^.\s.$/);
  });

  it('scales to max within window', () => {
    const result = sparkline([1, 2, 4, 8]);
    expect(result.length).toBe(4);
    expect(result[3]).toBe('█');
  });
});

describe('bar', () => {
  it('renders full bar for ratio 1', () => {
    expect(bar(1, 10)).toBe('█'.repeat(10));
  });

  it('renders empty bar for ratio 0', () => {
    expect(bar(0, 10)).toBe('░'.repeat(10));
  });

  it('renders half bar for ratio 0.5', () => {
    expect(bar(0.5, 10)).toBe('█'.repeat(5) + '░'.repeat(5));
  });

  it('clamps ratios outside 0..1', () => {
    expect(bar(-0.5, 4)).toBe('░░░░');
    expect(bar(1.5, 4)).toBe('████');
  });
});

describe('formatDelta', () => {
  it('flags new when pct is null', () => {
    expect(formatDelta(null)).toEqual({ symbol: '→', text: 'new' });
  });

  it('flags flat when pct is 0', () => {
    expect(formatDelta(0)).toEqual({ symbol: '→', text: 'flat' });
  });

  it('uses ↑ for positive deltas', () => {
    expect(formatDelta(23)).toEqual({ symbol: '↑', text: '23%' });
  });

  it('uses ↓ for negative deltas', () => {
    expect(formatDelta(-12)).toEqual({ symbol: '↓', text: '12%' });
  });
});
