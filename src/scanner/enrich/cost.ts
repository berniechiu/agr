import { rateFor } from '../pricing.js';

export type CostEstimate = {
  usd: number | null;
  tokensIn: number;
  tokensOut: number;
};

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function estimateCost(lines: unknown[]): CostEstimate {
  let usdAccum = 0;
  let anyKnown = false;
  let anyUsage = false;
  let tokensIn = 0;
  let tokensOut = 0;

  for (const line of lines) {
    if (!line || typeof line !== 'object') continue;
    const entry = line as Record<string, unknown>;
    if (entry.type !== 'assistant') continue;
    const message = entry.message;
    if (!message || typeof message !== 'object') continue;
    const msg = message as Record<string, unknown>;
    const usage = msg.usage;
    if (!usage || typeof usage !== 'object') continue;
    const u = usage as Record<string, unknown>;
    anyUsage = true;

    const input = numberOr(u.input_tokens, 0);
    const output = numberOr(u.output_tokens, 0);
    const cacheWrite = numberOr(u.cache_creation_input_tokens, 0);
    const cacheRead = numberOr(u.cache_read_input_tokens, 0);

    tokensIn += input + cacheWrite + cacheRead;
    tokensOut += output;

    const model = typeof msg.model === 'string' ? msg.model : '';
    const rates = rateFor(model);
    if (!rates) continue;
    anyKnown = true;

    usdAccum += (input * rates.in
      + output * rates.out
      + cacheWrite * rates.cacheWrite
      + cacheRead * rates.cacheRead) / 1_000_000;
  }

  return {
    usd: anyUsage && anyKnown ? usdAccum : null,
    tokensIn,
    tokensOut,
  };
}
