import { discoverSessions } from '../scanner/discovery.js';
import pc from 'picocolors';

export async function statsCommand(): Promise<void> {
  const sessions = await discoverSessions();

  if (sessions.length === 0) {
    console.log(pc.dim('No sessions found.'));
    return;
  }

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = sessions.filter((s) => s.lastTimestamp >= weekAgo);

  const projectCounts = new Map<string, number>();
  for (const s of sessions) {
    const name = s.projectName || '(unknown)';
    projectCounts.set(name, (projectCounts.get(name) ?? 0) + 1);
  }

  const topProjects = [...projectCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);

  console.log(pc.bold('Session Statistics'));
  console.log('');
  console.log(`  Total sessions:    ${pc.cyan(String(sessions.length))}`);
  console.log(`  This week:         ${pc.cyan(String(thisWeek.length))}`);
  console.log(`  Total messages:    ${pc.cyan(String(totalMessages))}`);
  console.log(`  Projects:          ${pc.cyan(String(projectCounts.size))}`);
  console.log('');
  console.log(pc.bold('Top Projects'));
  console.log('');
  for (const [name, count] of topProjects) {
    console.log(`  ${pc.cyan(name.padEnd(25))} ${count} sessions`);
  }
}
