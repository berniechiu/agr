import type { SessionMeta } from '../types.js';

export interface TopProject {
  name: string;
  count: number;
  share: number;
  barRatio: number;
}

export interface StatsSummary {
  total: number;
  thisWeek: number;
  lastWeek: number;
  weekDeltaPct: number | null;
  currentStreak: number;
  longestStreak: number;
  medianMessages: number;
  longestMessages: number;
  activity14d: number[];
  topProjects: TopProject[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayKeyForOffset(now: number, daysAgo: number): string {
  return dayKey(now - daysAgo * DAY_MS);
}

function computeStreaks(activeDays: Set<string>, now: number): { current: number; longest: number } {
  let current = 0;
  for (let i = 0; i < 365; i++) {
    if (activeDays.has(dayKeyForOffset(now, i))) {
      current++;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }

  let longest = 0;
  let run = 0;
  for (let i = 0; i < 365; i++) {
    if (activeDays.has(dayKeyForOffset(now, i))) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }
  return { current, longest };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

export function computeStats(sessions: SessionMeta[], now: number = Date.now()): StatsSummary {
  const weekAgo = now - 7 * DAY_MS;
  const twoWeeksAgo = now - 14 * DAY_MS;

  const activeDays = new Set<string>();
  const projectCounts = new Map<string, number>();
  const activity14d = Array<number>(14).fill(0);
  const messageCounts: number[] = [];

  let thisWeek = 0;
  let lastWeek = 0;
  let longestMessages = 0;

  const dayIndex = new Map<string, number>();
  for (let i = 0; i < 14; i++) dayIndex.set(dayKeyForOffset(now, 13 - i), i);

  for (const s of sessions) {
    activeDays.add(dayKey(s.lastTimestamp));

    const name = s.projectName || '(unknown)';
    projectCounts.set(name, (projectCounts.get(name) ?? 0) + 1);

    messageCounts.push(s.messageCount);
    if (s.messageCount > longestMessages) longestMessages = s.messageCount;

    if (s.lastTimestamp >= weekAgo) {
      thisWeek++;
    } else if (s.lastTimestamp >= twoWeeksAgo) {
      lastWeek++;
    }

    const idx = dayIndex.get(dayKey(s.lastTimestamp));
    if (idx !== undefined) activity14d[idx]++;
  }

  const weekDeltaPct = lastWeek === 0
    ? (thisWeek === 0 ? 0 : null)
    : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);

  const { current: currentStreak, longest: longestStreak } = computeStreaks(activeDays, now);

  const topProjectsRaw = [...projectCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const topMax = topProjectsRaw[0]?.[1] ?? 0;
  const topProjects: TopProject[] = topProjectsRaw.map(([name, count]) => ({
    name,
    count,
    share: sessions.length > 0 ? count / sessions.length : 0,
    barRatio: topMax > 0 ? count / topMax : 0,
  }));

  return {
    total: sessions.length,
    thisWeek,
    lastWeek,
    weekDeltaPct,
    currentStreak,
    longestStreak,
    medianMessages: median(messageCounts),
    longestMessages,
    activity14d,
    topProjects,
  };
}

const SPARK_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

export function sparkline(values: number[]): string {
  if (values.length === 0) return '';
  const max = Math.max(...values);
  if (max === 0) return SPARK_CHARS[0].repeat(values.length);
  return values
    .map((v) => {
      if (v === 0) return ' ';
      const ratio = v / max;
      const idx = Math.min(SPARK_CHARS.length - 1, Math.max(0, Math.ceil(ratio * SPARK_CHARS.length) - 1));
      return SPARK_CHARS[idx];
    })
    .join('');
}

export function bar(ratio: number, width: number): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  const filled = Math.round(clamped * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

export function formatDelta(pct: number | null): { symbol: string; text: string } {
  if (pct === null) return { symbol: '→', text: 'new' };
  if (pct === 0) return { symbol: '→', text: 'flat' };
  const symbol = pct > 0 ? '↑' : '↓';
  return { symbol, text: `${Math.abs(pct)}%` };
}
