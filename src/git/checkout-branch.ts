import { execFileSync } from 'node:child_process';

export type CheckoutResult =
  | { kind: 'ok' }
  | { kind: 'skip-no-branch' }
  | { kind: 'skip-not-repo' }
  | { kind: 'warn-missing-branch'; branch: string; currentBranch: string }
  | { kind: 'error-dirty'; branch: string }
  | { kind: 'error-checkout-failed'; branch: string; stderr: string };

interface GitResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

function runGit(cwd: string, args: string[]): GitResult {
  try {
    const stdout = execFileSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, stdout: stdout.trim(), stderr: '' };
  } catch (err: unknown) {
    const e = err as { stderr?: Buffer | string };
    const stderr = typeof e.stderr === 'string'
      ? e.stderr
      : e.stderr?.toString() ?? '';
    return { ok: false, stdout: '', stderr: stderr.trim() };
  }
}

export function ensureBranchCheckedOut(
  cwd: string,
  branch: string | undefined,
): CheckoutResult {
  if (!branch) return { kind: 'skip-no-branch' };
  if (cwd === '') return { kind: 'skip-not-repo' };

  const insideRepo = runGit(cwd, ['rev-parse', '--is-inside-work-tree']);
  if (!insideRepo.ok || insideRepo.stdout !== 'true') {
    return { kind: 'skip-not-repo' };
  }

  const current = runGit(cwd, ['branch', '--show-current']);
  if (current.ok && current.stdout === branch) return { kind: 'ok' };

  const status = runGit(cwd, ['status', '--porcelain']);
  if (!status.ok || status.stdout.length > 0) {
    return { kind: 'error-dirty', branch };
  }

  const verify = runGit(cwd, ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]);
  if (!verify.ok) {
    return { kind: 'warn-missing-branch', branch, currentBranch: current.stdout };
  }

  const checkout = runGit(cwd, ['checkout', branch]);
  if (!checkout.ok) {
    return { kind: 'error-checkout-failed', branch, stderr: checkout.stderr };
  }

  return { kind: 'ok' };
}
