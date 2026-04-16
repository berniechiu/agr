import { discoverSessions } from '../scanner/discovery.js';
import { addTag, resolveSessionId } from '../tags/tag-store.js';
import { inlinePicker } from '../picker/inline-picker.js';
import { resumeSession } from '../resume-session.js';
import pc from 'picocolors';

export async function tagCommand(first: string, second?: string): Promise<void> {
  const sessions = await discoverSessions();

  if (second) {
    const allIds = sessions.map((s) => s.id);
    const resolved = resolveSessionId(first, allIds);

    if (!resolved) {
      const matches = allIds.filter((id) => id.startsWith(first));
      if (matches.length > 1) {
        console.log(pc.yellow(`Ambiguous prefix "${first}" matches ${matches.length} sessions:`));
        for (const id of matches.slice(0, 5)) {
          console.log(`  ${pc.dim(id)}`);
        }
        console.log(pc.dim('Provide more characters.'));
      } else {
        console.log(pc.red(`No session found matching "${first}".`));
      }
      return;
    }

    addTag(resolved, second);
    console.log(`Tagged ${pc.cyan(resolved.slice(0, 8))} with ${pc.yellow(`"${second}"`)}`);
    return;
  }

  const lower = first.toLowerCase();
  const matching = sessions.filter((s) =>
    s.tags.some((t) => t.toLowerCase().includes(lower)),
  );

  if (matching.length === 0) {
    console.log(pc.dim(`No sessions found with tag matching "${first}".`));
    return;
  }

  const projects = new Set(matching.map((s) => s.projectName).filter(Boolean));
  const result = await inlinePicker(matching, projects.size);

  if (result) {
    resumeSession(result.session);
  }
}
