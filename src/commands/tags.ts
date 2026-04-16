import { discoverSessions } from '../scanner/discovery.js';
import { loadTagStore } from '../tags/tag-store.js';
import pc from 'picocolors';

export async function tagsCommand(): Promise<void> {
  const sessions = await discoverSessions();
  const store = loadTagStore();

  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  const tagSummary = new Map<string, { count: number; projects: Set<string> }>();

  for (const [sessionId, tags] of Object.entries(store)) {
    const session = sessionMap.get(sessionId);
    for (const tag of tags) {
      let entry = tagSummary.get(tag);
      if (!entry) {
        entry = { count: 0, projects: new Set() };
        tagSummary.set(tag, entry);
      }
      entry.count++;
      if (session?.projectName) {
        entry.projects.add(session.projectName);
      }
    }
  }

  if (tagSummary.size === 0) {
    console.log(pc.dim('No tags found. Use "agr tag <session-id> <tag>" to tag a session.'));
    return;
  }

  const sorted = [...tagSummary.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  for (const [tag, info] of sorted) {
    const count = `${info.count} session${info.count === 1 ? '' : 's'}`;
    const projects = info.projects.size > 0
      ? pc.dim(`  (${[...info.projects].join(', ')})`)
      : '';
    console.log(`${pc.yellow(tag.padEnd(30))} ${pc.cyan(count)}${projects}`);
  }
}
