import pc from 'picocolors';
import type { SessionMeta } from './types.js';

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatSessionRow(session: SessionMeta, isSelected: boolean): string {
  const indicator = isSelected ? pc.cyan('❯') : ' ';
  const active = session.isActive ? pc.green(' ●') : '';
  const project = pc.cyan(truncate(session.projectName, 14).padEnd(14));
  const tags = session.tags.length > 0
    ? ' ' + session.tags.map((t) => pc.yellow(`#${t}`)).join(' ')
    : '';
  const title = truncate(session.title, 40);
  const date = pc.dim(formatDate(session.lastTimestamp).padStart(5));
  const msgs = pc.dim(`${session.messageCount} msgs`.padStart(8));

  return `${indicator}${active} ${project} ${title.padEnd(40)} ${date} ${msgs}${tags}`;
}

export function formatStatusBar(totalSessions: number, totalProjects: number): string {
  return pc.dim(
    `${totalSessions} sessions · ${totalProjects} projects · ↑↓ navigate · type to filter · ⏎ resume · t tag · u untag`,
  );
}
