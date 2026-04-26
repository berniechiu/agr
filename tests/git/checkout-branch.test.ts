import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ensureBranchCheckedOut } from '../../src/git/checkout-branch.js';

function git(cwd: string, args: string[]): void {
  execFileSync('git', ['-C', cwd, ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'agr-test',
      GIT_AUTHOR_EMAIL: 'agr-test@example.com',
      GIT_COMMITTER_NAME: 'agr-test',
      GIT_COMMITTER_EMAIL: 'agr-test@example.com',
    },
  });
}

let repo: string;

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'agr-git-'));
  git(repo, ['init', '--quiet', '--initial-branch=main']);
  writeFileSync(join(repo, 'a.txt'), 'first\n');
  git(repo, ['add', 'a.txt']);
  git(repo, ['commit', '--quiet', '-m', 'init']);
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('ensureBranchCheckedOut', () => {
  it('returns skip-no-branch when branch is undefined', () => {
    expect(ensureBranchCheckedOut(repo, undefined)).toEqual({ kind: 'skip-no-branch' });
  });

  it('returns skip-not-repo when cwd is not a git repo', () => {
    const notRepo = mkdtempSync(join(tmpdir(), 'agr-not-git-'));
    try {
      expect(ensureBranchCheckedOut(notRepo, 'main')).toEqual({ kind: 'skip-not-repo' });
    } finally {
      rmSync(notRepo, { recursive: true, force: true });
    }
  });

  it('returns skip-not-repo when cwd is empty string', () => {
    expect(ensureBranchCheckedOut('', 'main')).toEqual({ kind: 'skip-not-repo' });
  });

  it('returns ok on the fast path when already on the target branch', () => {
    expect(ensureBranchCheckedOut(repo, 'main')).toEqual({ kind: 'ok' });
  });

  it('checks out an existing different branch and returns ok', () => {
    git(repo, ['checkout', '--quiet', '-b', 'feat/x']);
    git(repo, ['checkout', '--quiet', 'main']);

    expect(ensureBranchCheckedOut(repo, 'feat/x')).toEqual({ kind: 'ok' });

    const current = execFileSync('git', ['-C', repo, 'branch', '--show-current'], { encoding: 'utf8' }).trim();
    expect(current).toBe('feat/x');
  });

  it('returns warn-missing-branch when target branch does not exist locally', () => {
    expect(ensureBranchCheckedOut(repo, 'feat/missing')).toEqual({
      kind: 'warn-missing-branch',
      branch: 'feat/missing',
      currentBranch: 'main',
    });
  });

  it('returns error-dirty when working tree has uncommitted changes', () => {
    git(repo, ['checkout', '--quiet', '-b', 'feat/x']);
    git(repo, ['checkout', '--quiet', 'main']);
    appendFileSync(join(repo, 'a.txt'), 'dirty\n');

    expect(ensureBranchCheckedOut(repo, 'feat/x')).toEqual({
      kind: 'error-dirty',
      branch: 'feat/x',
    });
  });
});
