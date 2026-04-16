import { discoverSessions } from '../scanner/discovery.js';
import { removeTag, resolveSessionId } from '../tags/tag-store.js';
import pc from 'picocolors';

export async function untagCommand(sessionIdPrefix: string, tag: string): Promise<void> {
  const sessions = await discoverSessions();
  const allIds = sessions.map((s) => s.id);
  const resolved = resolveSessionId(sessionIdPrefix, allIds);

  if (!resolved) {
    const matches = allIds.filter((id) => id.startsWith(sessionIdPrefix));
    if (matches.length > 1) {
      console.log(pc.yellow(`Ambiguous prefix "${sessionIdPrefix}" matches ${matches.length} sessions.`));
    } else {
      console.log(pc.red(`No session found matching "${sessionIdPrefix}".`));
    }
    return;
  }

  removeTag(resolved, tag);
  console.log(`Removed ${pc.yellow(`"${tag}"`)} from ${pc.cyan(resolved.slice(0, 8))}`);
}
