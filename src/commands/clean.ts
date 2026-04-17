import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getProjectsDir } from '../config.js';
import { parseSessionFile } from '../scanner/parser.js';
import { pruneOrphanedTags } from '../tags/tag-store.js';
import { pruneOrphanedTitles } from '../titles/title-store.js';
import { UUID_JSONL_REGEX } from '../types.js';
import pc from 'picocolors';

export async function cleanCommand(): Promise<void> {
  const projectsDir = getProjectsDir();

  let projectDirs: string[];
  try {
    projectDirs = readdirSync(projectsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    console.log(pc.dim('No projects directory found.'));
    return;
  }

  const validIds = new Set<string>();
  let emptyCount = 0;

  for (const projectDir of projectDirs) {
    const projectPath = join(projectsDir, projectDir);
    let files: string[];
    try {
      files = readdirSync(projectPath).filter((f) => UUID_JSONL_REGEX.test(f));
    } catch {
      continue;
    }

    for (const file of files) {
      const sessionId = file.replace('.jsonl', '');
      const filePath = join(projectPath, file);

      const meta = await parseSessionFile(filePath, sessionId);
      if (!meta) {
        emptyCount++;
      } else {
        validIds.add(sessionId);
      }
    }
  }

  console.log(pc.bold('Clean Summary'));
  console.log(`  Empty sessions:    ${pc.yellow(String(emptyCount))}`);
  console.log(`  Valid sessions:    ${pc.green(String(validIds.size))}`);

  const prunedTags = pruneOrphanedTags(validIds);
  if (prunedTags > 0) {
    console.log(pc.green(`Pruned ${prunedTags} orphaned tag entries.`));
  } else {
    console.log(pc.dim('No orphaned tags found.'));
  }

  const prunedTitles = pruneOrphanedTitles(validIds);
  if (prunedTitles > 0) {
    console.log(pc.green(`Pruned ${prunedTitles} orphaned title overrides.`));
  } else {
    console.log(pc.dim('No orphaned title overrides found.'));
  }
}
