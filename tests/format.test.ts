import { describe, it, expect } from 'vitest';
import { formatSessionRow, formatDate, truncate } from '../src/format.js';
import type { SessionMeta } from '../src/types.js';

describe('truncate', () => {
  it('returns string unchanged if under max length', () => {
    expect(truncate('short', 20)).toBe('short');
  });

  it('truncates and adds ellipsis', () => {
    expect(truncate('this is a very long string', 10)).toBe('this is...');
  });
});

describe('formatDate', () => {
  it('formats timestamp as M/DD', () => {
    const ts = new Date(2026, 3, 16).getTime();
    expect(formatDate(ts)).toBe('4/16');
  });
});

describe('formatSessionRow', () => {
  const session: SessionMeta = {
    id: 'aaaa1111-2222-3333-4444-555566667777',
    projectName: 'myapp',
    cwd: '/Users/test/projects/myapp',
    gitBranch: 'main',
    title: 'Fix the login bug',
    firstPrompt: 'Fix the login bug',
    firstTimestamp: 1700000000000,
    lastTimestamp: 1700000070000,
    messageCount: 4,
    filePath: '/some/path',
    tags: [],
    isActive: false,
  };

  it('includes project name, title, date, and message count', () => {
    const row = formatSessionRow(session, false);
    expect(row).toContain('myapp');
    expect(row).toContain('Fix the login bug');
    expect(row).toContain('4 msgs');
  });

  it('shows tag inline when present', () => {
    const tagged = { ...session, tags: ['AWS Audit'] };
    const row = formatSessionRow(tagged, false);
    expect(row).toContain('[AWS Audit]');
  });

  it('shows active indicator', () => {
    const active = { ...session, isActive: true };
    const row = formatSessionRow(active, false);
    expect(row).toContain('●');
  });
});
