import { discoverSessions } from '../scanner/discovery.js';
import { renderPicker } from '../picker/render-picker.js';
import { resumeSession } from '../resume-session.js';
import pc from 'picocolors';

export async function listCommand(): Promise<void> {
  const sessions = await discoverSessions();

  if (sessions.length === 0) {
    console.log(pc.dim('No sessions found in ~/.claude/projects/. Start a Claude Code session first.'));
    return;
  }

  const cwd = process.cwd();
  const localSessions = sessions.filter((s) => s.cwd === cwd);
  const initial = localSessions.length > 0 ? localSessions : sessions;

  const projects = new Set(sessions.map((s) => s.projectName).filter(Boolean));
  const result = await renderPicker(initial, projects.size, sessions);

  if (result) {
    resumeSession(result.session);
  }
}
