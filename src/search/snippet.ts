const DEFAULT_RADIUS = 40;

function sanitize(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '');
}

export function extractSnippet(
  text: string,
  matchStart: number,
  matchEnd: number,
  radius: number = DEFAULT_RADIUS,
): string {
  const sliceStart = Math.max(0, matchStart - radius);
  const sliceEnd = Math.min(text.length, matchEnd + radius);
  const before = sanitize(text.slice(sliceStart, matchStart)).replace(/\s+/g, ' ');
  const middle = sanitize(text.slice(matchStart, matchEnd)).replace(/\s+/g, ' ');
  const after = sanitize(text.slice(matchEnd, sliceEnd)).replace(/\s+/g, ' ');
  const body = `${before}${middle}${after}`.trim();
  const leading = sliceStart > 0 ? '…' : '';
  const trailing = sliceEnd < text.length ? '…' : '';
  return `${leading}${body}${trailing}`;
}
