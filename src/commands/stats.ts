import { discoverSessions } from '../scanner/discovery.js';
import { computeStats, sparkline, bar, formatDelta } from './stats-compute.js';
import pc from 'picocolors';

const LABEL_WIDTH = 20;
const BAR_WIDTH = 20;
const PROJECT_WIDTH = 20;

function labeled(label: string, value: string, suffix?: string): string {
  const l = label.padEnd(LABEL_WIDTH);
  return suffix
    ? `  ${l}${value}  ${pc.dim(suffix)}`
    : `  ${l}${value}`;
}

export async function statsCommand(): Promise<void> {
  const sessions = await discoverSessions();

  if (sessions.length === 0) {
    console.log(pc.dim('No sessions found.'));
    return;
  }

  const s = computeStats(sessions);

  const delta = formatDelta(s.weekDeltaPct);
  const deltaSuffix = s.lastWeek === 0 && s.thisWeek > 0
    ? '(no prior week)'
    : `(${delta.symbol} ${delta.text} vs last week)`;

  const streakSuffix = s.longestStreak > s.currentStreak
    ? `(best: ${s.longestStreak})`
    : s.currentStreak > 0
      ? '(best)'
      : undefined;

  const lengthSuffix = s.longestMessages > s.medianMessages
    ? `(longest: ${s.longestMessages})`
    : undefined;

  console.log(pc.bold('Session Statistics'));
  console.log('');
  console.log(labeled('Total sessions', pc.cyan(String(s.total))));
  console.log(labeled('This week', pc.cyan(String(s.thisWeek)), deltaSuffix));
  console.log(labeled(
    'Active streak',
    pc.cyan(`${s.currentStreak} day${s.currentStreak === 1 ? '' : 's'}`),
    streakSuffix,
  ));
  console.log(labeled(
    'Median length',
    pc.cyan(`${s.medianMessages} msg${s.medianMessages === 1 ? '' : 's'}`),
    lengthSuffix,
  ));
  console.log('');
  console.log(labeled('Activity (14d)', pc.cyan(sparkline(s.activity14d))));
  console.log('');
  console.log(pc.bold('Top Projects'));
  console.log('');
  for (const p of s.topProjects) {
    const name = p.name.length > PROJECT_WIDTH
      ? p.name.slice(0, PROJECT_WIDTH - 1) + '…'
      : p.name.padEnd(PROJECT_WIDTH);
    const barStr = bar(p.barRatio, BAR_WIDTH);
    const count = String(p.count).padStart(4);
    const share = `(${Math.round(p.share * 100)}%)`;
    console.log(`  ${pc.cyan(name)}  ${barStr}  ${count}  ${pc.dim(share)}`);
  }
}
