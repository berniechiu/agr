import { discoverSessions } from '../scanner/discovery.js';
import { resolveSessionId } from '../tags/tag-store.js';
import { resumeSession } from '../resume-session.js';
import pc from 'picocolors';

export async function resumeCommand(idOrName: string): Promise<void> {
  const sessions = await discoverSessions();
  const allIds = sessions.map((s) => s.id);

  const resolved = resolveSessionId(idOrName, allIds);

  if (resolved) {
    const session = sessions.find((s) => s.id === resolved)!;
    resumeSession(session);
    return;
  }

  const lower = idOrName.toLowerCase();
  const byTitle = sessions.filter((s) => s.title.toLowerCase().includes(lower));

  if (byTitle.length === 1) {
    resumeSession(byTitle[0]);
    return;
  }

  if (byTitle.length > 1) {
    console.log(pc.yellow(`Multiple sessions match "${idOrName}":`));
    for (const s of byTitle.slice(0, 10)) {
      console.log(`  ${pc.dim(s.id.slice(0, 8))}  ${s.projectName}  ${s.title}`);
    }
    console.log(pc.dim('\nProvide more characters to narrow the match.'));
    return;
  }

  console.log(pc.red(`No session found matching "${idOrName}".`));
}
