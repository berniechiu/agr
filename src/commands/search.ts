import { discoverSessions } from '../scanner/discovery.js';
import { searchSessionFile } from '../search/full-text.js';
import { renderPicker } from '../picker/render-picker.js';
import { resumeSession } from '../resume-session.js';
import pc from 'picocolors';
import type { SessionMeta } from '../types.js';

export async function searchCommand(text: string): Promise<void> {
  const sessions = await discoverSessions();

  const words = text.trim().split(/\s+/);
  const isSingleWord = words.length === 1;

  let scopeSessions: SessionMeta[];
  let contentQuery: string;
  let scopeLabel: string;

  if (isSingleWord) {
    const cwd = process.cwd();
    scopeSessions = sessions.filter((s) => s.cwd === cwd);
    if (scopeSessions.length === 0) {
      scopeSessions = sessions;
      scopeLabel = 'all projects';
    } else {
      scopeLabel = scopeSessions[0].projectName || 'current project';
    }
    contentQuery = words[0];
  } else {
    const projectFilter = words[0].toLowerCase();
    scopeSessions = sessions.filter((s) =>
      s.projectName.toLowerCase().includes(projectFilter),
    );
    if (scopeSessions.length === 0) {
      console.log(pc.dim(`No projects matching "${words[0]}".`));
      return;
    }
    scopeLabel = [...new Set(scopeSessions.map((s) => s.projectName))].join(', ');
    contentQuery = words.slice(1).join(' ');
  }

  console.log(pc.dim(`Searching ${scopeSessions.length} sessions in ${scopeLabel} for "${contentQuery}"...`));

  const matchingSessions: SessionMeta[] = [];

  for (const session of scopeSessions) {
    const matches = await searchSessionFile(session.filePath, contentQuery, 5);
    if (matches.length > 0) {
      matchingSessions.push(session);
    }
  }

  if (matchingSessions.length === 0) {
    console.log(pc.dim(`No sessions found containing "${text}".`));
    return;
  }

  console.log(pc.green(`Found ${matchingSessions.length} sessions.`));

  const projects = new Set(matchingSessions.map((s) => s.projectName).filter(Boolean));
  const result = await renderPicker(matchingSessions, projects.size);

  if (result) {
    resumeSession(result.session);
  }
}
