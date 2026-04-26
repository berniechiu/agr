import { execFileSync } from 'node:child_process';
import pc from 'picocolors';
import type { SessionMeta } from './types.js';
import { ensureBranchCheckedOut } from './git/checkout-branch.js';

function fail(message: string, detail?: string): never {
  console.error(pc.red(message));
  if (detail) console.error(pc.dim(detail));
  process.exit(1);
}

export function resumeSession(session: SessionMeta): void {
  const result = ensureBranchCheckedOut(session.cwd, session.gitBranch);

  switch (result.kind) {
    case 'error-dirty':
      fail(
        `agr: cannot checkout ${result.branch} — uncommitted changes in ${session.cwd}`,
        'agr: commit, stash, or discard changes and try again',
      );
    case 'error-checkout-failed':
      fail(`agr: failed to checkout ${result.branch}`, result.stderr || undefined);
    case 'warn-missing-branch':
      console.warn(pc.yellow(
        `agr: branch ${result.branch} no longer exists, resuming on ${result.currentBranch || 'current branch'}`,
      ));
      break;
    case 'ok':
    case 'skip-no-branch':
    case 'skip-not-repo':
      break;
  }

  try {
    execFileSync('claude', ['--resume', session.id], {
      stdio: 'inherit',
      cwd: session.cwd || process.cwd(),
    });
  } catch {}
}
