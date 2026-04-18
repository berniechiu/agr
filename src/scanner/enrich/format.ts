import type { FilesTouched } from './files.js';
import type { CostEstimate } from './cost.js';

const PATH_MAX = 60;

export function formatPath(path: string): string {
  if (path.length <= PATH_MAX) return path;
  const head = path.slice(0, Math.ceil(PATH_MAX / 2) - 1);
  const tail = path.slice(-(Math.floor(PATH_MAX / 2) - 1));
  return `${head}…${tail}`;
}

export function formatFilesTouched(files: FilesTouched): string {
  if (files.total === 0) return 'no file edits';
  const top = files.top
    .map(({ path, edits }) => `${formatPath(path)} ×${edits}`)
    .join(', ');
  if (files.top.length === files.total) return top;
  return `${files.total} files — ${top}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function formatCost(cost: CostEstimate): string {
  if (cost.usd === null) return '— (no usage data)';
  const usd = cost.usd < 0.005
    ? '<$0.01'
    : `$${cost.usd.toFixed(2)}`;
  return `${usd} (${formatTokens(cost.tokensIn)} in / ${formatTokens(cost.tokensOut)} out)`;
}
