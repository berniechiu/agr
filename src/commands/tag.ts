import { discoverSessions } from '../scanner/discovery.js';
import { renderPicker } from '../picker/render-picker.js';
import { resumeSession } from '../resume-session.js';
import pc from 'picocolors';

export async function tagCommand(tagName: string): Promise<void> {
  const sessions = await discoverSessions();

  const lower = tagName.toLowerCase();
  const matching = sessions.filter((s) =>
    s.tags.some((t) => t.toLowerCase().includes(lower)),
  );

  if (matching.length === 0) {
    console.log(pc.dim(`No sessions found with tag matching "${tagName}".`));
    return;
  }

  const result = await renderPicker(matching);

  if (result) {
    resumeSession(result.session);
  }
}
