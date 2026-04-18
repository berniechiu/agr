export type Rates = {
  in: number;         // USD per million input tokens
  out: number;        // USD per million output tokens
  cacheWrite: number; // USD per million cache-creation tokens
  cacheRead: number;  // USD per million cache-read tokens
};

export const MODEL_RATES: Record<string, Rates> = {
  'claude-opus-4-7':   { in: 15, out: 75, cacheWrite: 18.75, cacheRead: 1.50 },
  'claude-sonnet-4-6': { in: 3,  out: 15, cacheWrite: 3.75,  cacheRead: 0.30 },
  'claude-haiku-4-5':  { in: 1,  out: 5,  cacheWrite: 1.25,  cacheRead: 0.10 },
};

export function rateFor(model: string): Rates | null {
  if (MODEL_RATES[model]) return MODEL_RATES[model];
  // Strip a trailing -YYYYMMDD style suffix and retry once.
  const stripped = model.replace(/-\d{6,}$/, '');
  if (stripped !== model && MODEL_RATES[stripped]) return MODEL_RATES[stripped];
  return null;
}
